const Poolbase = artifacts.require("./Poolbase.sol");
const PoolbaseEventEmitter = artifacts.require("./PoolbaseEventEmitter.sol");
const BigNumber = web3.BigNumber;

const { ensuresException, ether } = require("../helpers/utils");

contract(
  "Poolbase",
  ([
    owner,
    investor1,
    investor2,
    bouncer1,
    bouncer2,
    admin1,
    admin2,
    payoutWallet,
    adminPayoutWallet,
    poolbasePayoutWallet,
    newPoolbasePayoutWallet,
    newAdminPayoutWallet
  ]) => {
    let poolbase, poolbaseEventEmitter;
    const maxAllocation = new BigNumber(200);
    const isAdminFeeInWei = true;
    const adminPoolFee = [1, 2];
    const poolbaseFee = [2, 5];

    beforeEach(async () => {
      poolbaseEventEmitter = await PoolbaseEventEmitter.new();
      poolbase = await Poolbase.new();
    });

    describe("#init", () => {
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
        eventEmitterContractValue.should.be.equal(poolbaseEventEmitter.address);
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
          [admin1, admin2]
        );
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

      // space for testing emergencyRemoveTokens

      // function emergencyRemoveTokens
      //   (
      //   ERC20 _tokenAddress,
      //   address beneficiary,
      //   uint256 _value
      //   )
      // external
      // onlyRole(ROLE_ADMIN)
      // {
      //   require
      //     (
      //     beneficiary != address(0) &&
      //     _value != 0 && poolbaseVouched &&
      //     adminVouched,
      //     "params should not be empty and vouches must be set"
      //     );

      //   ERC20(_tokenAddress).transfer(beneficiary, _value);
      // }

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
    });
  }
);
