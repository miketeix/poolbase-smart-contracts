const { should, ensuresException } = require("../helpers/utils");
const PoolbaseFactory = artifacts.require("./PoolbaseFactory.sol");

const BigNumber = web3.BigNumber;

contract(
  "PoolbaseFactory",
  ([
    owner,
    bouncer,
    bouncer2,
    admin,
    admin2,
    payoutWallet,
    adminPayoutWallet,
    poolbasePayoutWallet,
    eventEmitterContract
  ]) => {
    let poolbaseFactory;
    const maxAllocation = new BigNumber(200);
    const isAdminFeeInWei = true;
    const adminPoolFee = [1, 2];

    beforeEach(async () => {
      poolbaseFactory = await PoolbaseFactory.new();
    });

    describe("#setSuperBouncers", () => {
      it.skip("does NOT allow a NON owner to set superBouncers", async () => {
        const bouncers = [bouncer, bouncer2];
        // possible bug with web3 as it cannot catch exception when func params is an array od addresses
        try {
          await poolbaseFactory.setSuperBouncers(bouncers, {
            from: admin
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const superBouncers = await poolbaseFactory.getSuperBouncers();
        superBouncers[0].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
        superBouncers[1].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it.skip("does NOT allow a owner to set empty address as a super bouncer", async () => {
        // possible bug with web3 as it cannot catch exception when func params is an array od addresses
        try {
          await poolbaseFactory.setSuperBouncers(
            ["0x0000000000000000000000000000000000000000", bouncer2],
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const superBouncers = await poolbaseFactory.getSuperBouncers();
        superBouncers[0].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
        superBouncers[1].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("allows owner to set superBouncers", async () => {
        await poolbaseFactory.setSuperBouncers([bouncer, bouncer2], {
          from: owner
        });

        const superBouncers = await poolbaseFactory.getSuperBouncers();
        superBouncers[0].should.be.equal(bouncer);
        superBouncers[1].should.be.equal(bouncer2);
      });
    });

    describe("#setPoolbasePayoutWallet", () => {
      it("does NOT allow a NON owner to set poolbasePayoutWallet", async () => {
        try {
          await poolbaseFactory.setPoolbasePayoutWallet(poolbasePayoutWallet, {
            from: admin
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbasePayoutWallet_ = await poolbaseFactory.getPoolbasePayoutWallet();
        poolbasePayoutWallet_.should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("does NOT allow a owner to set empty address as a super bouncer", async () => {
        try {
          await poolbaseFactory.setPoolbasePayoutWallet(
            "0x0000000000000000000000000000000000000000",
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbasePayoutWallet_ = await poolbaseFactory.getPoolbasePayoutWallet();
        poolbasePayoutWallet_.should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("allows owner to set poolbasePayoutWallet", async () => {
        await poolbaseFactory.setPoolbasePayoutWallet(poolbasePayoutWallet, {
          from: owner
        });

        const poolbasePayoutWallet_ = await poolbaseFactory.getPoolbasePayoutWallet();
        poolbasePayoutWallet_.should.be.equal(poolbasePayoutWallet);
      });
    });

    describe("#setPoolbaseFee", () => {
      it("does NOT allow a NON owner to set poolbaseFee", async () => {
        try {
          await poolbaseFactory.setPoolbaseFee([1, 2], {
            from: admin
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbaseFee = await poolbaseFactory.getPoolbaseFee();
        poolbaseFee[0].should.be.bignumber.equal(0);
        poolbaseFee[1].should.be.bignumber.equal(0);
      });

      it("does NOT allow a owner to set empty address as a super bouncer", async () => {
        try {
          await poolbaseFactory.setPoolbaseFee([0, 2], {
            from: owner
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbaseFee = await poolbaseFactory.getPoolbaseFee();
        poolbaseFee[0].should.be.bignumber.equal(0);
        poolbaseFee[1].should.be.bignumber.equal(0);
      });

      it("allows owner to set poolbaseFee", async () => {
        await poolbaseFactory.setPoolbaseFee([1, 2], {
          from: owner
        });

        const poolbaseFee = await poolbaseFactory.getPoolbaseFee();
        poolbaseFee[0].should.be.bignumber.equal(1);
        poolbaseFee[1].should.be.bignumber.equal(2);
      });
    });

    describe("poobase factory contract deployment", () => {
      beforeEach(async () => {
        await poolbaseFactory.setSuperBouncers([bouncer, bouncer2]);
        await poolbaseFactory.setPoolbasePayoutWallet(poolbasePayoutWallet);
        await poolbaseFactory.setPoolbaseFee([1, 2]);
      });

      it("deploys new poolbase contract", async () => {
        const poolbase = await poolbaseFactory.create.call(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2]
        );

        expect(poolbase).to.exist;
      });

      it("emits ContractInstantiation", async () => {
        const { logs } = await poolbaseFactory.create(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

        const event = logs.find(e => e.event === "ContractInstantiation");
        expect(event).to.exist;

        const { args } = logs[0];
        const { msgSender, instantiation, hashMessage } = args;
        msgSender.should.be.equal(owner);

        const isInstantiation = await poolbaseFactory.isInstantiation.call(
          instantiation
        );
        isInstantiation.should.be.true;

        expect(hashMessage).to.exist;
      });

      it("registers the number of poolbase contract deployed per address", async () => {
        const poolbase = await poolbaseFactory.create(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

        let numberOfInstantiations = await poolbaseFactory.getInstantiationCount(
          owner
        );
        numberOfInstantiations.should.be.bignumber.equal(1);

        const poolbase2 = await poolbaseFactory.create(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

        numberOfInstantiations = await poolbaseFactory.getInstantiationCount(
          owner
        );
        numberOfInstantiations.should.be.bignumber.equal(2);
      });
    });
  }
);
