const Poolbase = artifacts.require("./PoolbaseV2.sol");
const PoolbaseEventEmitter = artifacts.require("./PoolbaseEventEmitter.sol");
const BigNumber = web3.BigNumber;

const { ensuresException, ether } = require("../helpers/utils");

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
    adminPayoutWallet,
    poolbasePayoutWallet
  ]) => {
    let poolbase, poolbaseEventEmitter;
    const maxAllocation = new BigNumber(200);
    const isAdminFeeInWei = true;
    const adminPoolFee = [1, 2];
    const poolbaseFee = [2, 5];

    beforeEach(async () => {
      poolbaseEventEmitter = await PoolbaseEventEmitter.new();
      poolbase = await Poolbase.new([bouncer1, bouncer2]);
    });

    it("constructor sets bouncer", async () => {
      const roleBouncer = await poolbase.ROLE_BOUNCER();

      const isBouncer1 = await poolbase.hasRole.call(bouncer1, roleBouncer);
      isBouncer1.should.be.true;

      const isBouncer2 = await poolbase.hasRole.call(bouncer2, roleBouncer);
      isBouncer2.should.be.true;

      const isBouncer3 = await poolbase.hasRole.call(owner, roleBouncer);
      isBouncer3.should.be.false;

      const isBouncer4 = await poolbase.hasRole.call(admin1, roleBouncer);
      isBouncer4.should.be.false;
    });

    describe("#fallback function", () => {
      it("does not accept ether", async () => {
        try {
          await poolbase.sendTransaction({ from: admin1, value: ether(1) });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbaseWeiBalance = await web3.eth.getBalance(poolbase.address);
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

    describe("#init", () => {
      beforeEach(async () => {
        await poolbase.init(
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
        const roleAmind = await poolbase.ROLE_ADMIN();

        const isAdmin1 = await poolbase.hasRole.call(admin1, roleAmind);
        isAdmin1.should.be.true;

        const isAdmin2 = await poolbase.hasRole.call(admin2, roleAmind);
        isAdmin2.should.be.true;
      });

      it("cannot call init again once initial values are set", async () => {
        // attempt to override initial values should throw exceptions
        try {
          await poolbase.init(
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
    });
  }
);
