const Poolbase = artifacts.require("./Poolbase.sol");
const PoolbaseEventEmitter = artifacts.require("./PoolbaseEventEmitter.sol");
const BigNumber = web3.BigNumber;

const { should, ensuresException, ether } = require("../helpers/utils");

contract(
  "Poolbase",
  ([
    owner,
    wallet,
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
      poolbase = await Poolbase.new(
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

    // describe("constructor sets global variables", () => {
    //   it("sets the pool threshold", async () => {
    //     const thresholdInContract = await felixPool.threshold();
    //     thresholdInContract.should.be.bignumber.equal(threshold);
    //   });

    //   it("sets the pool cap", async () => {
    //     const capInContract = await felixPool.cap();
    //     capInContract.should.be.bignumber.equal(cap);
    //   });

    //   it("sets endTime", async () => {
    //     const endTimeInContract = await felixPool.endTime();
    //     endTimeInContract.should.be.bignumber.equal(endTime);
    //   });

    //   it("sets admin", async () => {
    //     const admin = await felixPool.admin();
    //     admin.should.be.bignumber.equal(owner);
    //   });

    //   it("sets rate", async () => {
    //     const rateInContract = await felixPool.rate();
    //     rateInContract.should.be.bignumber.equal(rate);
    //   });

    //   it("creates refund vault contract with a wallet", async () => {
    //     const refundVaultInContract = await felixPool.vault();
    //     refundVaultInContract.should.be.equal(vault.address);

    //     const vaultWallet = await vault.wallet();
    //     vaultWallet.should.be.equal(wallet);
    //   });
    // });
  }
);
