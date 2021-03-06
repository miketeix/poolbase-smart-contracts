const Poolbase = artifacts.require("./Poolbase.sol");
const TokenMock = artifacts.require("./TokenMock.sol");
const ReceivePoolPayoutMock = artifacts.require("./ReceivePoolPayoutMock.sol");
const PoolbaseEventEmitter = artifacts.require("./PoolbaseEventEmitter.sol");
web3.BigNumber.config({
  DECIMAL_PLACES: 0,
  ROUNDING_MODE: web3.BigNumber.ROUND_FLOOR
});
const BigNumber = web3.BigNumber;
const {
  ensuresException,
  ether,
  keccak256,
  getMethodId
} = require("../helpers/utils");
const assertRevert = require("../helpers/assertRevert");

contract(
  "Poolbase",
  ([
    owner,
    investor1,
    investor2,
    investor3,
    bouncer1,
    bouncer2,
    admin1,
    admin2,
    payoutWallet,
    newPayoutWallet,
    adminPayoutWallet,
    poolbasePayoutWallet,
    newPoolbasePayoutWallet,
    newAdminPayoutWallet
  ]) => {
    let poolbase, poolbaseEventEmitter, token;
    const maxAllocation = ether(200);
    const isAdminFeeInWei = true;
    const adminPoolFee = [1, 2];
    const poolbaseFee = [2, 5];
    let validSignatureInvestor1,
      validSignatureInvestor2,
      validSignatureInvestor3;

    beforeEach(async () => {
      poolbaseEventEmitter = await PoolbaseEventEmitter.new();
      poolbase = await Poolbase.new();
    });

    context("when init function is set", () => {
      beforeEach(async () => {
        await poolbase.init(
          [bouncer1, bouncer2],
          maxAllocation,
          adminPoolFee,
          poolbaseFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          poolbasePayoutWallet,
          poolbaseEventEmitter.address,
          [admin1, admin2],
          { from: owner }
        );
      });

      describe("#init", () => {
        it("sets bouncer", async () => {
          const roleBouncer = await poolbase.ROLE_BOUNCER();

          const isBouncer1 = await poolbase.hasRole.call(bouncer1, roleBouncer);
          isBouncer1.should.be.true;

          const isBouncer2 = await poolbase.hasRole.call(bouncer2, roleBouncer);
          isBouncer2.should.be.true;

          const isBouncer3 = await poolbase.hasRole.call(admin1, roleBouncer);
          isBouncer3.should.be.false;

          const isBouncer4 = await poolbase.hasRole.call(admin2, roleBouncer);
          isBouncer4.should.be.false;
        });

        it("sets poolbase creator as bouncer", async () => {
          const roleBouncer = await poolbase.ROLE_BOUNCER();

          const isBouncer = await poolbase.hasRole(owner, roleBouncer);
          isBouncer.should.be.true;
        });

        it("sets the pool maxAllocation", async () => {
          const maxAllocationValue = await poolbase.maxAllocation();
          maxAllocationValue.should.be.bignumber.equal(maxAllocation);
        });

        it("sets adminPoolFee", async () => {
          const adminPoolFeeFirstValue = await poolbase.adminPoolFee(0);
          const adminPoolFeeSecondValue = await poolbase.adminPoolFee(1);
          adminPoolFeeFirstValue.should.be.bignumber.equal(adminPoolFee[0]);
          adminPoolFeeSecondValue.should.be.bignumber.equal(adminPoolFee[1]);
        });

        it("sets poolbaseFee", async () => {
          const poolbaseFeeFirstValue = await poolbase.poolbaseFee(0);
          const poolbaseFeeSecondValue = await poolbase.poolbaseFee(1);

          poolbaseFeeFirstValue.should.be.bignumber.equal(poolbaseFee[0]);
          poolbaseFeeSecondValue.should.be.bignumber.equal(poolbaseFee[1]);
        });

        it("sets isAdminFeeInWei", async () => {
          const isAdminFeeInWeiValue = await poolbase.isAdminFeeInWei();
          isAdminFeeInWeiValue.should.be.equal(isAdminFeeInWei);
        });

        it("sets payoutWallet", async () => {
          const payoutWalletValue = await poolbase.payoutWallet();
          payoutWalletValue.should.be.equal(payoutWallet);
        });

        it("sets adminPayoutWallet", async () => {
          const adminPayoutWalletValue = await poolbase.adminPayoutWallet();
          adminPayoutWalletValue.should.be.equal(adminPayoutWallet);
        });

        it("sets poolbasePayoutWallet", async () => {
          const poolbasePayoutWalletValue = await poolbase.poolbasePayoutWallet();
          poolbasePayoutWalletValue.should.be.equal(poolbasePayoutWallet);
        });

        it("sets eventEmitterContract", async () => {
          const eventEmitterContractValue = await poolbase.eventEmitter();
          eventEmitterContractValue.should.be.equal(
            poolbaseEventEmitter.address
          );
        });

        it("sets admins", async () => {
          const roleAdmin = await poolbase.ROLE_ADMIN();

          const isAdmin1 = await poolbase.hasRole.call(admin1, roleAdmin);
          isAdmin1.should.be.true;

          const isAdmin2 = await poolbase.hasRole.call(admin2, roleAdmin);
          isAdmin2.should.be.true;
        });

        it("sets tx.origin as an admin", async () => {
          const roleAdmin = await poolbase.ROLE_ADMIN();

          const isAdmin = await poolbase.hasRole.call(owner, roleAdmin);
          isAdmin.should.be.true;
        });

        it("cannot call init again once initial values are set", async () => {
          // attempt to override initial values should throw exceptions
          try {
            await poolbase.init(
              [bouncer1, bouncer2],
              new BigNumber(100),
              [5, 7],
              [8, 9],
              false,
              payoutWallet,
              adminPayoutWallet,
              poolbasePayoutWallet,
              poolbaseEventEmitter.address,
              [investor1, investor2]
            );
            assert.fail();
          } catch (error) {
            ensuresException(error);
          }

          const maxAllocationValue = await poolbase.maxAllocation();
          // maxAllocation is still the same
          maxAllocationValue.should.be.bignumber.equal(maxAllocation);
        });
      });

      describe("#fallback function", () => {
        it("does not accept ether", async () => {
          try {
            await poolbase.sendTransaction({ from: admin1, value: ether(1) });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const poolbaseWeiBalance = await web3.eth.getBalance(
            poolbase.address
          );
          poolbaseWeiBalance.should.be.bignumber.equal(0);
        });

        it("accepts ether once the acceptAllPayments is set", async () => {
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(0);

          await poolbase.emergencyAcceptAllPayments(true, { from: bouncer1 });
          await poolbase.sendTransaction({ from: admin1, value: ether(1) });

          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));

          // set acceptAllPayments flag back to false
          await poolbase.emergencyAcceptAllPayments(false, { from: bouncer1 });

          try {
            await poolbase.sendTransaction({ from: admin1, value: ether(1) });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          // balance is still 1 ether
          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));
        });
      });

      describe("#paused", () => {
        it("does not pause contract when it triggered by a non-poolbase-bouncer", async () => {
          try {
            await poolbase.pause({ from: admin1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isPaused = await poolbase.paused();
          isPaused.should.be.false;

          await poolbase.pause({ from: bouncer1 });

          isPaused = await poolbase.paused();
          isPaused.should.be.true;
        });

        it("does not pause when contract is already paused", async () => {
          await poolbase.pause({ from: bouncer1 });

          try {
            await poolbase.pause({ from: bouncer1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isPaused = await poolbase.paused();
          isPaused.should.be.true;
        });

        it("emits Pause event", async () => {
          const watcher = poolbaseEventEmitter.Pause();

          await poolbase.pause({ from: bouncer1 });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress } = args;

          event.should.be.equal("Pause");
          msgSender.should.be.equal(bouncer1);
          poolContractAddress.should.be.equal(poolbase.address);
        });
      });

      describe("#unpaused", () => {
        it("does not unpause contract when it triggered by a non-poolbase-bouncer", async () => {
          await poolbase.pause({ from: bouncer1 });

          try {
            await poolbase.unpause({ from: admin1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isPaused = await poolbase.paused();
          isPaused.should.be.true;

          await poolbase.unpause({ from: bouncer1 });

          isPaused = await poolbase.paused();
          isPaused.should.be.false;
        });

        it("does not unpause when contract is already unpaused", async () => {
          try {
            await poolbase.unpause({ from: bouncer1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isPaused = await poolbase.paused();
          isPaused.should.be.false;
        });

        it("emits Unpause event", async () => {
          await poolbase.pause({ from: bouncer1 });
          const watcher = poolbaseEventEmitter.Unpause();

          await poolbase.unpause({ from: bouncer1 });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress } = args;

          event.should.be.equal("Unpause");
          msgSender.should.be.equal(bouncer1);
          poolContractAddress.should.be.equal(poolbase.address);
        });
      });

      describe("#emergencySetStateToRefunding", () => {
        it("does not set state to refunding when called by a non-poolbase-bouncer", async () => {
          // enum State { Active, Refunding, Closed, TokenPayout }
          let currentState = await poolbase.state();
          currentState.should.be.bignumber.equal(0); // Active

          try {
            await poolbase.emergencySetStateToRefunding({
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          currentState = await poolbase.state();
          currentState.should.be.bignumber.equal(0); // Active

          await poolbase.emergencySetStateToRefunding({
            from: bouncer1
          });

          currentState = await poolbase.state();
          currentState.should.be.bignumber.equal(1); // Refunding
        });

        it("sets state to refunding", async () => {
          let currentState = await poolbase.state();
          currentState.should.be.bignumber.equal(0); // Active

          await poolbase.emergencySetStateToRefunding({
            from: bouncer1
          });

          currentState = await poolbase.state();
          currentState.should.be.bignumber.equal(1); // Refunding
        });

        it("emits RefundsEnabled event", async () => {
          const watcher = poolbaseEventEmitter.RefundsEnabled();

          await poolbase.emergencySetStateToRefunding({
            from: bouncer1
          });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress } = args;

          event.should.be.equal("RefundsEnabled");
          msgSender.should.be.equal(bouncer1);
          poolContractAddress.should.be.equal(poolbase.address);
        });
      });

      describe("#emergencyReceiveWeiFromPayoutAddress", () => {
        it("does not receive wei when it is not from payoutWallet", async () => {
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(0);

          try {
            await poolbase.emergencyReceiveWeiFromPayoutAddress({
              from: admin1,
              value: ether(1)
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(0);

          await poolbase.emergencyReceiveWeiFromPayoutAddress({
            from: payoutWallet,
            value: ether(1)
          });

          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));
        });

        it("receives wei from payoutWallet", async () => {
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(0);

          await poolbase.emergencyReceiveWeiFromPayoutAddress({
            from: payoutWallet,
            value: ether(1)
          });

          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));
        });
      });

      describe("#emergencyAcceptAllPayments", () => {
        it("does not set emergency flag when called by a non-poolbase-bouncer", async () => {
          let currentAcceptAllPayments = await poolbase.acceptAllPayments();
          currentAcceptAllPayments.should.be.false;

          try {
            await poolbase.emergencyAcceptAllPayments(true, { from: admin1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          currentAcceptAllPayments = await poolbase.acceptAllPayments();
          currentAcceptAllPayments.should.be.false;

          await poolbase.emergencyAcceptAllPayments(true, { from: bouncer1 });

          currentAcceptAllPayments = await poolbase.acceptAllPayments();
          currentAcceptAllPayments.should.be.true;
        });

        it("sets emergency flag acceptAllPayments", async () => {
          let currentAcceptAllPayments = await poolbase.acceptAllPayments();
          currentAcceptAllPayments.should.be.false;

          await poolbase.emergencyAcceptAllPayments(true, {
            from: bouncer1
          });

          currentAcceptAllPayments = await poolbase.acceptAllPayments();
          currentAcceptAllPayments.should.be.true;

          // toggles back works
          await poolbase.emergencyAcceptAllPayments(false, {
            from: bouncer1
          });

          currentAcceptAllPayments = await poolbase.acceptAllPayments();
          currentAcceptAllPayments.should.be.false;
        });
      });

      describe("#vouchAsPoolBase", () => {
        it("does not set vouch flag when called by a non-poolbase-bouncer", async () => {
          let isPoolbaseVouched = await poolbase.poolbaseVouched();
          isPoolbaseVouched.should.be.false;

          try {
            await poolbase.vouchAsPoolBase({ from: admin1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          isPoolbaseVouched = await poolbase.poolbaseVouched();
          isPoolbaseVouched.should.be.false;

          await poolbase.vouchAsPoolBase({ from: bouncer1 });

          isPoolbaseVouched = await poolbase.poolbaseVouched();
          isPoolbaseVouched.should.be.true;
        });

        it("sets poolbase vouch flag", async () => {
          let isPoolbaseVouched = await poolbase.poolbaseVouched();
          isPoolbaseVouched.should.be.false;

          await poolbase.vouchAsPoolBase({ from: bouncer1 });

          isPoolbaseVouched = await poolbase.poolbaseVouched();
          isPoolbaseVouched.should.be.true;
        });
      });

      describe("#vouchAsAdmin", () => {
        it("does not set vouch flag when called by a non-admin", async () => {
          let isAdminVouched = await poolbase.adminVouched();
          isAdminVouched.should.be.false;

          try {
            await poolbase.vouchAsAdmin({ from: bouncer1 });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          isAdminVouched = await poolbase.adminVouched();
          isAdminVouched.should.be.false;

          await poolbase.vouchAsAdmin({ from: admin1 });

          isAdminVouched = await poolbase.adminVouched();
          isAdminVouched.should.be.true;
        });

        it("sets admin vouch flag", async () => {
          let isAdminVouched = await poolbase.adminVouched();
          isAdminVouched.should.be.false;

          await poolbase.vouchAsAdmin({ from: admin1 });

          isAdminVouched = await poolbase.adminVouched();
          isAdminVouched.should.be.true;
        });
      });

      describe("#emergencyRemoveWei", () => {
        beforeEach(async () => {
          //receives 1 ether from payoutWallet
          await poolbase.emergencyReceiveWeiFromPayoutAddress({
            from: payoutWallet,
            value: ether(1)
          });
        });

        it("fails when a non-admin calls it", async () => {
          try {
            await poolbase.emergencyRemoveWei(bouncer1, ether(1), {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          // still balance of 1 ether
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));
        });

        it("fails when params are empty", async () => {
          try {
            await poolbase.emergencyRemoveWei(bouncer1, 0, {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          // another attempt with an empty params
          try {
            await poolbase.emergencyRemoveWei("0x00000000000", ether(1), {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          // still balance of 1 ether
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));
        });

        it("does not remove wei from contract when vouches are not given", async () => {
          // first attempt to remove ether from poolbase
          try {
            await poolbase.emergencyRemoveWei(admin1, ether(1), {
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          // still balance of 1 ether
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));

          // vouch as admin
          await poolbase.vouchAsAdmin({ from: admin1 });

          // second attempt to remove ether from poolbase. Needs still one more vouch
          try {
            await poolbase.emergencyRemoveWei(admin1, ether(1), {
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));

          // vouch as poolbase
          await poolbase.vouchAsPoolBase({ from: bouncer1 });

          // third attempts all vouches set
          await poolbase.emergencyRemoveWei(admin1, ether(1), {
            from: admin1
          });

          // 1 ether removed from the poolbase contract
          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(0);
        });

        it("is able to remove ether from poolbase when vouch flags are set", async () => {
          let poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(ether(1));

          // vouch as admin
          await poolbase.vouchAsAdmin({ from: admin1 });
          // vouch as poolbase
          await poolbase.vouchAsPoolBase({ from: bouncer1 });

          await poolbase.emergencyRemoveWei(admin1, ether(1), {
            from: admin1
          });

          poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
          poolbaseWeiBalance.should.be.bignumber.equal(0);
        });
      });

      describe("#setPoolbasePayoutWallet", () => {
        it("does NOT allow a NON bouncer to set a new poolbasePayoutWallet", async () => {
          try {
            await poolbase.setPoolbasePayoutWallet(newPoolbasePayoutWallet, {
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const poolbasePayoutWallet_ = await poolbase.poolbasePayoutWallet();
          poolbasePayoutWallet_.should.be.equal(poolbasePayoutWallet);
        });

        it("does NOT allow a bouncer to set empty address for payoutWallet", async () => {
          try {
            await poolbase.setPoolbasePayoutWallet(
              "0x0000000000000000000000000000000000000000",
              { from: bouncer1 }
            );
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const poolbasePayoutWallet_ = await poolbase.poolbasePayoutWallet();
          poolbasePayoutWallet_.should.be.equal(poolbasePayoutWallet);
        });

        it("allows bouncer to set a new poolbasePayoutWallet", async () => {
          await poolbase.setPoolbasePayoutWallet(newPoolbasePayoutWallet, {
            from: bouncer1
          });

          const poolbasePayoutWallet_ = await poolbase.poolbasePayoutWallet();
          poolbasePayoutWallet_.should.be.equal(newPoolbasePayoutWallet);
        });
      });

      describe("#setAdminPayoutWallet", () => {
        it("does NOT allow a NON admin to set a new poolbasePayoutWallet", async () => {
          try {
            await poolbase.setAdminPayoutWallet(poolbasePayoutWallet, {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const adminPayoutWallet_ = await poolbase.adminPayoutWallet();
          adminPayoutWallet_.should.be.equal(adminPayoutWallet);
        });

        it("does NOT allow an admin to set empty address for adminPayoutWallet", async () => {
          try {
            await poolbase.setAdminPayoutWallet(
              "0x0000000000000000000000000000000000000000",
              { from: admin1 }
            );
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }
        });

        it("allows admin to set a new adminPayoutWallet", async () => {
          await poolbase.setAdminPayoutWallet(newAdminPayoutWallet, {
            from: admin1
          });

          const adminPayoutWallet_ = await poolbase.adminPayoutWallet();
          adminPayoutWallet_.should.be.equal(newAdminPayoutWallet);
        });

        it("emits AdminPayoutWalletSet event", async () => {
          const watcher = poolbaseEventEmitter.AdminPayoutWalletSet();

          await poolbase.setAdminPayoutWallet(newAdminPayoutWallet, {
            from: admin1
          });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress, adminPayoutWallet } = args;

          event.should.be.equal("AdminPayoutWalletSet");
          msgSender.should.be.equal(admin1);
          poolContractAddress.should.be.equal(poolbase.address);
          adminPayoutWallet.should.be.equal(newAdminPayoutWallet);
        });
      });

      describe("#setPoolbaseFee", () => {
        it("does NOT allow a NON bouncer to set poolbaseFee", async () => {
          try {
            await poolbase.setPoolbaseFee([8, 9], {
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const poolbaseFee1 = await poolbase.poolbaseFee(0);
          const poolbaseFee2 = await poolbase.poolbaseFee(1);
          poolbaseFee1.should.be.bignumber.equal(poolbaseFee[0]);
          poolbaseFee2.should.be.bignumber.equal(poolbaseFee[1]);
        });

        it("does NOT allow a bouncer to set empty address for poolbase fee", async () => {
          try {
            await poolbase.setPoolbaseFee([0, 0], {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const poolbaseFee1 = await poolbase.poolbaseFee(0);
          const poolbaseFee2 = await poolbase.poolbaseFee(1);
          poolbaseFee1.should.be.bignumber.equal(poolbaseFee[0]);
          poolbaseFee2.should.be.bignumber.equal(poolbaseFee[1]);
        });

        it("allows bouncer to set poolbaseFee", async () => {
          const newPoolbaseFee = [8, 9];
          await poolbase.setPoolbaseFee(newPoolbaseFee, {
            from: bouncer1
          });

          const poolbaseFee1 = await poolbase.poolbaseFee(0);
          const poolbaseFee2 = await poolbase.poolbaseFee(1);
          poolbaseFee1.should.be.bignumber.equal(newPoolbaseFee[0]);
          poolbaseFee2.should.be.bignumber.equal(newPoolbaseFee[1]);
        });
      });

      describe("#setAdminPoolFee", () => {
        it("does NOT allow a NON admin to set adminPoolFee", async () => {
          try {
            await poolbase.setAdminPoolFee([8, 9], {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const adminPoolFee1 = await poolbase.adminPoolFee(0);
          const adminPoolFee2 = await poolbase.adminPoolFee(1);
          adminPoolFee1.should.be.bignumber.equal(adminPoolFee[0]);
          adminPoolFee2.should.be.bignumber.equal(adminPoolFee[1]);
        });

        it("does NOT allow a admin to set empty address for adminPoolFee", async () => {
          try {
            await poolbase.setAdminPoolFee([0, 0], {
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const adminPoolFee1 = await poolbase.adminPoolFee(0);
          const adminPoolFee2 = await poolbase.adminPoolFee(1);
          adminPoolFee1.should.be.bignumber.equal(adminPoolFee[0]);
          adminPoolFee2.should.be.bignumber.equal(adminPoolFee[1]);
        });

        it("allows admin to set adminPoolFee", async () => {
          const newAdminPoolFee = [8, 9];
          await poolbase.setAdminPoolFee(newAdminPoolFee, {
            from: admin1
          });

          const adminPoolFee1 = await poolbase.adminPoolFee(0);
          const adminPoolFee2 = await poolbase.adminPoolFee(1);
          adminPoolFee1.should.be.bignumber.equal(newAdminPoolFee[0]);
          adminPoolFee2.should.be.bignumber.equal(newAdminPoolFee[1]);
        });

        it("emits AdminPoolFeeSet event", async () => {
          const newAdminPoolFee = [8, 9];
          const watcher = poolbaseEventEmitter.AdminPoolFeeSet();

          await poolbase.setAdminPoolFee(newAdminPoolFee, {
            from: admin1
          });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress, adminPoolFee } = args;

          event.should.be.equal("AdminPoolFeeSet");
          msgSender.should.be.equal(admin1);
          poolContractAddress.should.be.equal(poolbase.address);
          adminPoolFee[0].should.be.bignumber.equal(newAdminPoolFee[0]);
          adminPoolFee[1].should.be.bignumber.equal(newAdminPoolFee[1]);
        });
      });

      describe("#changeMaxAllocation", () => {
        it("does NOT allow a NON admin to set maxAllocation", async () => {
          try {
            await poolbase.changeMaxAllocation(100, {
              from: bouncer1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const maxAllocationInPoolbase = await poolbase.maxAllocation();
          maxAllocationInPoolbase.should.be.bignumber.equal(maxAllocation);
        });

        it("does NOT allow a admin to set empty address for maxAllocation", async () => {
          try {
            await poolbase.changeMaxAllocation(0, {
              from: admin1
            });
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          const maxAllocationInPoolbase = await poolbase.maxAllocation();
          maxAllocationInPoolbase.should.be.bignumber.equal(maxAllocation);
        });

        it("allows admin to set maxAllocation", async () => {
          const newMaxAllocation = 100;
          await poolbase.changeMaxAllocation(newMaxAllocation, {
            from: admin1
          });

          const maxAllocationInPoolbase = await poolbase.maxAllocation();
          maxAllocationInPoolbase.should.be.bignumber.equal(newMaxAllocation);
        });

        it("emits MaxAllocationChanged event", async () => {
          const newMaxAllocation = 100;
          const watcher = poolbaseEventEmitter.MaxAllocationChanged();

          await poolbase.changeMaxAllocation(newMaxAllocation, {
            from: admin1
          });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress, maxAllocation } = args;

          event.should.be.equal("MaxAllocationChanged");
          msgSender.should.be.equal(admin1);
          poolContractAddress.should.be.equal(poolbase.address);
          maxAllocation.should.be.bignumber.equal(newMaxAllocation);
        });
      });

      describe("#enableRefunds", () => {
        // enum State { Active, Refunding, Closed, TokenPayout }
        it("cannot accept calls from a non admin", async () => {
          await assertRevert(poolbase.enableRefunds({ from: bouncer1 }));

          const poolbaseState = await poolbase.state();
          poolbaseState.should.be.bignumber.equal(0); // Active
        });

        it("cannot be triggered when contract is paused", async () => {
          await poolbase.pause({ from: bouncer1 });

          await assertRevert(poolbase.enableRefunds({ from: admin1 }));

          const poolbaseState = await poolbase.state();
          poolbaseState.should.be.bignumber.equal(0); // Active
        });

        it("requires state to be Active", async () => {
          await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

          await assertRevert(poolbase.enableRefunds({ from: admin1 }));
          const poolbaseState = await poolbase.state();
          poolbaseState.should.be.bignumber.equal(2); // Closed
        });

        it("sets state to Refuding", async () => {
          await poolbase.enableRefunds({ from: admin1 });

          const poolbaseState = await poolbase.state();
          poolbaseState.should.be.bignumber.equal(1); // Refunding
        });

        it("emits RefundsEnabled event", async () => {
          const watcher = poolbaseEventEmitter.RefundsEnabled();

          await poolbase.enableRefunds({ from: admin1 });

          const events = watcher.get();
          const { event, args } = events[0];
          const { msgSender, poolContractAddress } = args;

          event.should.be.equal("RefundsEnabled");
          msgSender.should.be.equal(admin1);
          poolContractAddress.should.be.equal(poolbase.address);
        });
      });

      context("when using ERC20 tokens", () => {
        beforeEach(async () => {
          //setup for investing mechanism functions
          const toSignInvestor1 = keccak256(poolbase.address, investor1);
          validSignatureInvestor1 = web3.eth.sign(bouncer1, toSignInvestor1);
          const toSignInvestor2 = keccak256(poolbase.address, investor2);
          validSignatureInvestor2 = web3.eth.sign(bouncer1, toSignInvestor2);
          const toSignInvestor3 = keccak256(poolbase.address, investor3);
          validSignatureInvestor3 = web3.eth.sign(bouncer1, toSignInvestor3);
          token = await TokenMock.new();
        });

        describe("#emergencyRemoveTokens", () => {
          beforeEach("contract has 1 token as balance", async () => {
            await token.transfer(poolbase.address, 1e18);
          });

          it("cannot be called by a non admin", async () => {
            await poolbase.vouchAsAdmin({ from: admin1 });
            await poolbase.vouchAsPoolBase({ from: bouncer1 });
            await assertRevert(
              poolbase.emergencyRemoveTokens(token.address, bouncer1, 1e18, {
                from: bouncer1
              })
            );

            const poolbaseBalance = await token.balanceOf(poolbase.address);
            poolbaseBalance.should.be.bignumber.eq(1e18);
          });

          it("cannot have empty beneficiary or zero value", async () => {
            await poolbase.vouchAsAdmin({ from: admin1 });
            await poolbase.vouchAsPoolBase({ from: bouncer1 });
            await assertRevert(
              poolbase.emergencyRemoveTokens(token.address, "0x0", 1e18, {
                from: admin1
              })
            );
            await assertRevert(
              poolbase.emergencyRemoveTokens(token.address, admin1, 0, {
                from: admin1
              })
            );

            const poolbaseBalance = await token.balanceOf(poolbase.address);
            poolbaseBalance.should.be.bignumber.eq(1e18);
          });

          it("requires that all vouch flags to be set", async () => {
            await assertRevert(
              poolbase.emergencyRemoveTokens(token.address, admin1, 1e18, {
                from: admin1
              })
            );

            const poolbaseBalance = await token.balanceOf(poolbase.address);
            poolbaseBalance.should.be.bignumber.eq(1e18);
          });

          it("withdraws ERC20 token from contract", async () => {
            await poolbase.vouchAsAdmin({ from: admin1 });
            await poolbase.vouchAsPoolBase({ from: bouncer1 });
            poolbase.emergencyRemoveTokens(token.address, admin1, 1e18, {
              from: admin1
            });

            const poolbaseBalance = await token.balanceOf(poolbase.address);
            poolbaseBalance.should.be.bignumber.eq(0);
          });
        });

        describe("#deposit", () => {
          it("requires state to be active", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            await assertRevert(
              poolbase.deposit(validSignatureInvestor1, {
                from: investor1,
                value: ether(10)
              })
            );
            const poolbaseState = await poolbase.state();
            poolbaseState.should.be.bignumber.equal(2); // Closed
          });

          it("requires valid signature signature", async () => {
            await assertRevert(
              poolbase.deposit(validSignatureInvestor1, {
                from: investor2,
                value: ether(10)
              })
            );
          });

          it("requires contributed ether that is smaller than maxAllocation", async () => {
            await assertRevert(
              poolbase.deposit(validSignatureInvestor1, {
                from: investor1,
                value: ether(201) //200 is max
              })
            );
          });

          it("should add user's contribution to deposited", async () => {
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });

            const deposited = await poolbase.deposited(investor1);
            deposited.should.be.bignumber.eq(ether(10));
          });

          it("emits ContributionMade event", async () => {
            const watcher = poolbaseEventEmitter.ContributionMade();

            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });

            const events = watcher.get();
            const { event, args } = events[0];
            const { msgSender, poolContractAddress, contribution } = args;

            event.should.be.equal("ContributionMade");
            msgSender.should.be.equal(investor1);
            poolContractAddress.should.be.equal(poolbase.address);
            contribution.should.be.bignumber.eq(ether(10));
          });
        });

        describe("#refund", () => {
          beforeEach(async () => {
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });
          });

          it("requires state to be active", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });
            const poolbaseState = await poolbase.state();
            poolbaseState.should.be.bignumber.equal(2); // Closed

            await assertRevert(
              poolbase.refund(validSignatureInvestor1, {
                from: investor1
              })
            );

            const deposited = await poolbase.deposited(investor1);
            deposited.should.be.bignumber.eq(ether(10));
            const investor1TokenBalance = await token.balanceOf(investor1);
            investor1TokenBalance.should.be.bignumber.eq(0);
          });

          it("requires valid signature", async () => {
            await assertRevert(
              poolbase.refund(validSignatureInvestor1, {
                from: investor2
              })
            );

            const deposited = await poolbase.deposited(investor1);
            deposited.should.be.bignumber.eq(ether(10));
            const investor1TokenBalance = await token.balanceOf(investor1);
            investor1TokenBalance.should.be.bignumber.eq(0);
          });

          it("refunds user's contribution setting the contribution to zero", async () => {
            const investor1Balance = await web3.eth.getBalance(investor1);

            await poolbase.refund(validSignatureInvestor1, {
              from: investor1
            });

            const deposited = await poolbase.deposited(investor1);
            deposited.should.be.bignumber.eq(0);

            const investor1BalanceAfterRefunding = await web3.eth.getBalance(
              investor1
            );
            // investor balance should have received its 10 ether from the contract after refund happened
            investor1BalanceAfterRefunding
              .toNumber()
              .should.be.approximately(
                investor1Balance.toNumber() + ether(10).toNumber(),
                1e16
              );
          });

          it("emits Refunded event", async () => {
            const watcher = poolbaseEventEmitter.Refunded();

            await poolbase.refund(validSignatureInvestor1, {
              from: investor1
            });

            const events = watcher.get();
            const { event, args } = events[0];
            const { msgSender, poolContractAddress, weiAmount } = args;

            event.should.be.equal("Refunded");
            msgSender.should.be.equal(investor1);
            poolContractAddress.should.be.equal(poolbase.address);
            weiAmount.should.be.bignumber.eq(ether(10));
          });
        });

        describe("#adminClosesPool", () => {
          beforeEach("10 ether contrubuted to the pool", async () => {
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });
          });
          // enum State { Active, Refunding, Closed, TokenPayout }
          it("requires to be admin", async () => {
            let currentState = await poolbase.state();
            currentState.should.be.bignumber.equal(0); // Active

            await assertRevert(
              poolbase.adminClosesPool("0x0", "0x0", { from: bouncer1 })
            );

            currentState = await poolbase.state();
            currentState.should.be.bignumber.equal(0); // still state Active
          });

          it("must have the contract state still to Active", async () => {
            await poolbase.enableRefunds({
              from: admin1
            });
            let currentState = await poolbase.state();
            currentState.should.be.bignumber.equal(1); // Refunding

            await assertRevert(
              poolbase.adminClosesPool("0x0", "0x0", { from: admin1 })
            );

            currentState = await poolbase.state();
            currentState.should.be.bignumber.equal(1); // Refunding
          });

          it("is able to set a new payOutWallet when passing it as params", async () => {
            await poolbase.adminClosesPool(newPayoutWallet, "0x0", {
              from: admin1
            });

            const poolPayoutWallet = await poolbase.payoutWallet();
            poolPayoutWallet.should.be.equal(newPayoutWallet);
          });

          it("works only when a payout address is set", async () => {
            poolbase = await Poolbase.new();

            await poolbase.init(
              [bouncer1, bouncer2],
              maxAllocation,
              adminPoolFee,
              poolbaseFee,
              isAdminFeeInWei,
              "0x0000000000000000000000000000000000000000",
              adminPayoutWallet,
              poolbasePayoutWallet,
              poolbaseEventEmitter.address,
              [admin1, admin2],
              { from: owner }
            );

            const toSignInvestor = keccak256(poolbase.address, investor1);
            validSignatureInvestor1 = web3.eth.sign(bouncer1, toSignInvestor);

            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });

            await assertRevert(
              poolbase.adminClosesPool("0x0", "0x0", { from: admin1 })
            );

            const poolPayoutWallet = await poolbase.payoutWallet();
            poolPayoutWallet.should.be.equal(
              "0x0000000000000000000000000000000000000000"
            );
          });

          // enum State { Active, Refunding, Closed, TokenPayout }
          it("sets state to Closed", async () => {
            let currentState = await poolbase.state();
            currentState.should.be.bignumber.equal(0); // Active

            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            currentState = await poolbase.state();
            currentState.should.be.bignumber.equal(2); // Closed
          });

          it("emits Closed event", async () => {
            const watcher = poolbaseEventEmitter.Closed();

            await poolbase.adminClosesPool("0x0", "0x0", {
              from: admin1
            });

            const events = watcher.get();
            const { event, args } = events[0];
            const { msgSender, poolContractAddress } = args;

            event.should.be.equal("Closed");
            msgSender.should.be.equal(admin1);
            poolContractAddress.should.be.equal(poolbase.address);
          });

          it("transfers poolbaseReward accurately", async () => {
            // 10 ether already deposited in pool
            const poolbasePayoutWalletWeiBalanceBefore = await web3.eth.getBalance(
              poolbasePayoutWallet
            );

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            await poolbase.adminClosesPool("0x0", "0x0", {
              from: admin1
            });

            const poolbasePayoutWalletWeiBalanceAfter = await web3.eth.getBalance(
              poolbasePayoutWallet
            );

            const poolbasePayoutWalletBalanceDiff = poolbasePayoutWalletWeiBalanceAfter.minus(
              poolbasePayoutWalletWeiBalanceBefore
            );

            poolbasePayoutWalletBalanceDiff.should.be.bignumber.eq(
              contractBalanceBefore.mul(poolbaseFee[0]).div(poolbaseFee[1])
            );

            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });

          it("transfers AdminReward correctly in Wei when isAdminFeeInWei flag is set", async () => {
            // 10 ether already deposited in pool and isAdminFeeInWei is set to true
            const adminPayoutWalletWeiBalanceBefore = await web3.eth.getBalance(
              adminPayoutWallet
            );

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            await poolbase.adminClosesPool("0x0", "0x0", {
              from: admin1
            });

            const adminPayoutWalletWeiBalanceAfter = await web3.eth.getBalance(
              adminPayoutWallet
            );

            const adminPayoutWalletBalanceDiff = adminPayoutWalletWeiBalanceAfter.minus(
              adminPayoutWalletWeiBalanceBefore
            );

            adminPayoutWalletBalanceDiff.should.be.bignumber.eq(
              contractBalanceBefore.mul(adminPoolFee[0]).div(adminPoolFee[1])
            );

            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });

          it("transfers pool funds correctly in Wei to payoutWallet when isAdminFeeInWei is set", async () => {
            // 10 ether already deposited in pool and isAdminFeeInWei is set to true
            const payoutWalletWeiBalanceBefore = await web3.eth.getBalance(
              payoutWallet
            );

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            const isAdminFeeInWei = await poolbase.isAdminFeeInWei();
            isAdminFeeInWei.should.be.true;
            await poolbase.adminClosesPool("0x0", "0x0", {
              from: admin1
            });

            const payoutWalletWeiBalanceAfter = await web3.eth.getBalance(
              payoutWallet
            );

            const payoutWalletBalanceDiff = payoutWalletWeiBalanceAfter.minus(
              payoutWalletWeiBalanceBefore
            );

            const poolbaseFeeTaken = contractBalanceBefore
              .mul(poolbaseFee[0])
              .div(poolbaseFee[1]);
            const adminPoolFeeTaken = contractBalanceBefore
              .mul(adminPoolFee[0])
              .div(adminPoolFee[1]);

            payoutWalletBalanceDiff.should.be.bignumber.eq(
              contractBalanceBefore
                .minus(poolbaseFeeTaken)
                .minus(adminPoolFeeTaken)
            );

            // pool should have no ether left
            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });

          it("transfers pool balance correctly in Wei to newPayoutWallet when isAdminFeeInWei is set", async () => {
            // 10 ether already deposited in pool and isAdminFeeInWei is set to true
            const newPayoutWalletWeiBalanceBefore = await web3.eth.getBalance(
              newPayoutWallet
            );

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            const isAdminFeeInWei = await poolbase.isAdminFeeInWei();
            isAdminFeeInWei.should.be.true;
            await poolbase.adminClosesPool(newPayoutWallet, "0x0", {
              from: admin1
            });

            const newPayoutWalletWeiBalanceAfter = await web3.eth.getBalance(
              newPayoutWallet
            );

            const newPayoutWalletBalanceDiff = newPayoutWalletWeiBalanceAfter.minus(
              newPayoutWalletWeiBalanceBefore
            );

            const poolbaseFeeTaken = contractBalanceBefore
              .mul(poolbaseFee[0])
              .div(poolbaseFee[1]);
            const adminPoolFeeTaken = contractBalanceBefore
              .mul(adminPoolFee[0])
              .div(adminPoolFee[1]);

            newPayoutWalletBalanceDiff.should.be.bignumber.eq(
              contractBalanceBefore
                .minus(poolbaseFeeTaken)
                .minus(adminPoolFeeTaken)
            );

            // pool should have no ether left
            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });

          it("transfers pool balance correctly in Wei to external smart contract when isAdminFeeInWei is set", async () => {
            // 10 ether already deposited in pool and isAdminFeeInWei is set to true

            const receivePoolPayout = await ReceivePoolPayoutMock.new();
            const hash = "0x" + getMethodId("receivePayout");

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            const isAdminFeeInWei = await poolbase.isAdminFeeInWei();
            isAdminFeeInWei.should.be.true;
            // admin closes the pool
            await poolbase.adminClosesPool(receivePoolPayout.address, hash, {
              from: admin1
            });

            const receivePoolPayoutWeiBalance = await web3.eth.getBalance(
              receivePoolPayout.address
            );

            const poolbaseFeeTaken = contractBalanceBefore
              .mul(poolbaseFee[0])
              .div(poolbaseFee[1]);
            const adminPoolFeeTaken = contractBalanceBefore
              .mul(adminPoolFee[0])
              .div(adminPoolFee[1]);

            receivePoolPayoutWeiBalance.should.be.bignumber.eq(
              contractBalanceBefore
                .minus(poolbaseFeeTaken)
                .minus(adminPoolFeeTaken)
            );

            // pool should have no ether left
            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });

          it("adds adminReward to totalWeiRaised and set admin's contribution when admin does not set isAdminFeeInWei", async () => {
            // setup
            poolbase = await Poolbase.new();

            const noAdminFeeInWei = false;

            await poolbase.init(
              [bouncer1, bouncer2],
              maxAllocation,
              adminPoolFee,
              poolbaseFee,
              noAdminFeeInWei,
              payoutWallet,
              adminPayoutWallet,
              poolbasePayoutWallet,
              poolbaseEventEmitter.address,
              [admin1, admin2],
              { from: owner }
            );
            const toSignInvestor = keccak256(poolbase.address, investor1);
            validSignatureInvestor1 = web3.eth.sign(bouncer1, toSignInvestor);
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });

            const payoutWalletWeiBalanceBefore = await web3.eth.getBalance(
              payoutWallet
            );

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            const isAdminFeeInWei = await poolbase.isAdminFeeInWei();
            isAdminFeeInWei.should.be.false;
            // admin closes pool
            await poolbase.adminClosesPool("0x0", "0x0", {
              from: admin1
            });

            const payoutWalletWeiBalanceAfter = await web3.eth.getBalance(
              payoutWallet
            );

            const payoutWalletBalanceDiff = payoutWalletWeiBalanceAfter.minus(
              payoutWalletWeiBalanceBefore
            );

            // only poolBaseFee is deducted from pool funds
            const poolbaseFeeTaken = contractBalanceBefore
              .mul(poolbaseFee[0])
              .div(poolbaseFee[1]);

            payoutWalletBalanceDiff.should.be.bignumber.eq(
              contractBalanceBefore.minus(poolbaseFeeTaken)
            );

            const adminPoolReward = contractBalanceBefore
              .mul(adminPoolFee[0])
              .div(adminPoolFee[1]);

            // admin should be now a contributor because he chose to receive tokens as payment
            const adminContribution = await poolbase.deposited(
              adminPayoutWallet
            );
            adminContribution.should.be.bignumber.eq(adminPoolReward);

            // adminReward should be added to totalWeiRaised
            const totalWeiRaised = await poolbase.totalWeiRaised();
            totalWeiRaised.should.be.bignumber.eq(
              contractBalanceBefore.add(adminPoolReward)
            );

            // pool should have no ether left
            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });

          it("sends funds to external contract plus adds adminReward to totalWeiRaised and set admin's contribution when admin does not set isAdminFeeInWei", async () => {
            // setup
            poolbase = await Poolbase.new();

            const noAdminFeeInWei = false;

            await poolbase.init(
              [bouncer1, bouncer2],
              maxAllocation,
              adminPoolFee,
              poolbaseFee,
              noAdminFeeInWei,
              payoutWallet,
              adminPayoutWallet,
              poolbasePayoutWallet,
              poolbaseEventEmitter.address,
              [admin1, admin2],
              { from: owner }
            );
            const toSignInvestor = keccak256(poolbase.address, investor1);
            validSignatureInvestor1 = web3.eth.sign(bouncer1, toSignInvestor);
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(10)
            });

            const receivePoolPayout = await ReceivePoolPayoutMock.new();
            const hash = "0x" + getMethodId("receivePayout");

            const contractBalanceBefore = await web3.eth.getBalance(
              poolbase.address
            );

            const isAdminFeeInWei = await poolbase.isAdminFeeInWei();
            isAdminFeeInWei.should.be.false;
            // admin closes pool
            await poolbase.adminClosesPool(receivePoolPayout.address, hash, {
              from: admin1
            });

            const receivePoolPayoutWeiBalance = await web3.eth.getBalance(
              receivePoolPayout.address
            );

            const poolbaseFeeTaken = contractBalanceBefore
              .mul(poolbaseFee[0])
              .div(poolbaseFee[1]);

            receivePoolPayoutWeiBalance.should.be.bignumber.eq(
              contractBalanceBefore.minus(poolbaseFeeTaken)
            );

            const adminPoolReward = contractBalanceBefore
              .mul(adminPoolFee[0])
              .div(adminPoolFee[1]);

            // admin should be now a contributor because he chose to receive tokens as payment
            const adminContribution = await poolbase.deposited(
              adminPayoutWallet
            );
            adminContribution.should.be.bignumber.eq(adminPoolReward);

            // adminReward should be added to totalWeiRaised
            const totalWeiRaised = await poolbase.totalWeiRaised();
            totalWeiRaised.should.be.bignumber.eq(
              contractBalanceBefore.add(adminPoolReward)
            );

            // pool should have no ether left
            const contractBalanceAfter = await web3.eth.getBalance(
              poolbase.address
            );
            contractBalanceAfter.should.be.bignumber.eq(0);
          });
        });

        describe("#adminSetsBatch", () => {
          beforeEach(async () => {
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(1)
            });
            await poolbase.deposit(validSignatureInvestor2, {
              from: investor2,
              value: ether(1)
            });

            // contract has 1 token as balance
            await token.transfer(poolbase.address, 1e18);
          });

          it("requires to be admin", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            await assertRevert(
              poolbase.adminSetsBatch(token.address, { from: bouncer1 })
            );
          });
          it("requires state to be closed or TokenPayout", async () => {
            await assertRevert(
              poolbase.adminSetsBatch(token.address, { from: admin1 })
            );
          });
          it("should not work with token balance of 0", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            const token2 = await TokenMock.new();
            await assertRevert(
              poolbase.adminSetsBatch(token2.address, { from: admin1 })
            );
          });
          it("should add total token balance of pool", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });
            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            const totalTokens = await poolbase.totalTokens();
            totalTokens.should.be.bignumber.eq(1e18);
          });
          it("should increase total token balance of pool when new tokens are added", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });
            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            let totalTokens = await poolbase.totalTokens();
            totalTokens.should.be.bignumber.eq(1e18);
            await token.transfer(poolbase.address, 1e18);

            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            totalTokens = await poolbase.totalTokens();
            totalTokens.should.be.bignumber.eq(ether(2));
          });
          it("should NOT work second time with a new token", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });
            await poolbase.adminSetsBatch(token.address, { from: admin1 });
            const token2 = await TokenMock.new();
            await token2.transfer(poolbase.address, 1e18);

            await assertRevert(
              poolbase.adminSetsBatch(token2.address, { from: admin1 })
            );
          });
        });

        describe("#claimToken", () => {
          beforeEach(async () => {
            await poolbase.deposit(validSignatureInvestor1, {
              from: investor1,
              value: ether(1)
            });

            await poolbase.deposit(validSignatureInvestor2, {
              from: investor2,
              value: ether(1)
            });
          });

          it("should only work when in state TokenPayout", async () => {
            await token.transfer(poolbase.address, 1e18);
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            await assertRevert(
              poolbase.claimToken(validSignatureInvestor1, { from: investor1 })
            );

            await assertRevert(
              poolbase.claimToken(validSignatureInvestor2, { from: investor2 })
            );
          });

          it("should only work when msg.sender deposited ether", async () => {
            await token.transfer(poolbase.address, 1e18);
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await assertRevert(
              poolbase.claimToken(validSignatureInvestor3, { from: investor3 })
            );
          });

          it("should claim the right proportion", async () => {
            await token.transfer(poolbase.address, 2e18); // contract has 2 tokens in token balance
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });

            const tokenBalance = await token.balanceOf(investor1);
            tokenBalance.should.be.bignumber.eq(1e18); // investor1 contribute 1 ether and get 1 token from the total of 2 tokens from the pool
          });

          it("should NOT claim again", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            await token.transfer(poolbase.address, 2e18); // contract has 2 tokens in token balance

            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            const tokenBalance = await token.balanceOf(investor1);
            tokenBalance.should.be.bignumber.eq(1e18);

            await assertRevert(
              poolbase.claimToken(validSignatureInvestor1, { from: investor1 })
            );
          });

          it("should allow for more tokens claims when new batch is added", async () => {
            await poolbase.adminClosesPool("0x0", "0x0", {
              from: admin1
            });

            await token.transfer(poolbase.address, 2e18); // contract has 2 tokens in token balance

            await poolbase.adminSetsBatch(token.address, {
              from: admin1
            });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            const tokenBalanceInvestor1 = await token.balanceOf(investor1);
            tokenBalanceInvestor1.should.be.bignumber.eq(1e18);

            await token.transfer(poolbase.address, ether(2)); // contract has more 2 tokens of a total of 4 added
            await poolbase.adminSetsBatch(token.address, {
              from: admin1
            });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            const tokenBalanceInvestor1AfterNewClaim = await token.balanceOf(
              investor1
            );
            tokenBalanceInvestor1AfterNewClaim.should.be.bignumber.eq(ether(2));

            // investor2 now claims batches
            await poolbase.claimToken(validSignatureInvestor2, {
              from: investor2
            });
            const tokenBalanceInvestor2 = await token.balanceOf(investor2);
            tokenBalanceInvestor2.should.be.bignumber.eq(ether(2));
          });

          it("claims tokens correctly even when proportion received is in the low amount of tokens", async () => {
            await poolbase.deposit(validSignatureInvestor2, {
              from: investor2,
              value: ether(1) // investor2 now contributed 2 (1 from beforeEach + 1 now) ether
            });

            await poolbase.deposit(validSignatureInvestor3, {
              from: investor3,
              value: ether(3)
            });
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            //1+2+3 =6   1/6 2/6 3/6
            await token.transfer(poolbase.address, 1e18);

            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            let tokenBalanceInvestor1 = await token.balanceOf(investor1);
            tokenBalanceInvestor1.should.be.bignumber.eq(ether(1).div(6));

            await poolbase.claimToken(validSignatureInvestor3, {
              from: investor3
            });
            let tokenBalanceInvestor3 = await token.balanceOf(investor3);
            tokenBalanceInvestor3.should.be.bignumber.eq(
              ether(1)
                .mul(3)
                .div(6)
            );

            await token.transfer(poolbase.address, ether(2)); // more 2 tokens added for the total of 3 tokens
            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor2, {
              from: investor2
            });
            const tokenBalanceInvestor2 = await token.balanceOf(investor2);
            tokenBalanceInvestor2.should.be.bignumber.eq(
              ether(3)
                .mul(2)
                .div(6)
            );

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            tokenBalanceInvestor1 = await token.balanceOf(investor1);
            tokenBalanceInvestor1.should.be.bignumber.eq(ether(3).div(6));

            await poolbase.claimToken(validSignatureInvestor3, {
              from: investor3
            });
            tokenBalanceInvestor3 = await token.balanceOf(investor3);
            tokenBalanceInvestor3.should.be.bignumber.eq(
              ether(3)
                .mul(3)
                .div(6)
            );
          });

          it("should claim tokens correctly when multiple batches are added and investor forgets to claim tokens in a previous batch", async () => {
            await poolbase.deposit(validSignatureInvestor2, {
              from: investor2,
              value: ether(2) // investor2 now contributed 3 (1 from beforeEach + 3 now) ether
            });
            await poolbase.deposit(validSignatureInvestor3, {
              from: investor3,
              value: ether(6)
            });
            await poolbase.adminClosesPool("0x0", "0x0", { from: admin1 });

            //1+3+6=10   1/10 3/10 6/10
            await token.transfer(poolbase.address, 20e18);

            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            let tokenBalanceInvestor1 = await token.balanceOf(investor1);
            tokenBalanceInvestor1.should.be.bignumber.eq(ether(20).div(10));

            await poolbase.claimToken(validSignatureInvestor3, {
              from: investor3
            });
            let tokenBalanceInvestor3 = await token.balanceOf(investor3);
            tokenBalanceInvestor3.should.be.bignumber.eq(
              ether(20)
                .mul(6)
                .div(10)
            );

            // setting 2nd batch
            await token.transfer(poolbase.address, ether(2)); // more 2 tokens are added. Total of added tokens is 22
            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor2, {
              from: investor2
            });

            // investor2 claims after 2nd batch is set but still receives same proportion of tokens
            let tokenBalanceInvestor2 = await token.balanceOf(investor2);
            tokenBalanceInvestor2.should.be.bignumber.eq(
              ether(22)
                .mul(3)
                .div(10)
            );

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            tokenBalanceInvestor1 = await token.balanceOf(investor1);
            tokenBalanceInvestor1.should.be.bignumber.eq(ether(22).div(10));

            await poolbase.claimToken(validSignatureInvestor3, {
              from: investor3
            });
            tokenBalanceInvestor3 = await token.balanceOf(investor3);
            tokenBalanceInvestor3.should.be.bignumber.eq(
              ether(22)
                .mul(6)
                .div(10)
            );

            // setting 3nd batch
            await token.transfer(poolbase.address, ether(7)); // more 7 tokens are added. Total of added tokens is 29
            await poolbase.adminSetsBatch(token.address, { from: admin1 });

            await poolbase.claimToken(validSignatureInvestor1, {
              from: investor1
            });
            tokenBalanceInvestor1 = await token.balanceOf(investor1);
            tokenBalanceInvestor1.should.be.bignumber.eq(ether(29).div(10));

            await poolbase.claimToken(validSignatureInvestor2, {
              from: investor2
            });
            tokenBalanceInvestor2 = await token.balanceOf(investor2);
            tokenBalanceInvestor2.should.be.bignumber.eq(
              ether(29)
                .mul(3)
                .div(10)
            );

            await poolbase.claimToken(validSignatureInvestor3, {
              from: investor3
            });
            tokenBalanceInvestor3 = await token.balanceOf(investor3);
            tokenBalanceInvestor3.should.be.bignumber.eq(
              ether(29)
                .mul(6)
                .div(10)
            );
          });
        });
        // close context 'when using ERC20 tokens'
      });
      // close context 'when init function is set'
    });
  }
);
