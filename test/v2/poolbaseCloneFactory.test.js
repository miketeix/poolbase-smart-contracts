const { ensuresException } = require("../helpers/utils");
const PoolbaseCloneFactory = artifacts.require("./PoolbaseCloneFactory.sol");
const Poolbase = artifacts.require("./PoolbaseV2.sol");

const BigNumber = web3.BigNumber;

contract(
  "PoolbaseCloneFactory",
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
    let poolbaseCloneFactory, poolbase, newPoolbase;
    const maxAllocation = new BigNumber(200);
    const isAdminFeeInWei = true;
    const adminPoolFee = [1, 2];

    beforeEach(async () => {
      poolbase = await Poolbase.new([bouncer, bouncer2]);
      poolbaseCloneFactory = await PoolbaseCloneFactory.new(poolbase.address);
    });

    describe("#setLibraryAddress", () => {
      beforeEach(async () => {
        newPoolbase = await Poolbase.new([bouncer, bouncer2]);
      });

      it("does NOT allow a NON owner to set new library address", async () => {
        try {
          await poolbaseCloneFactory.setLibraryAddress(newPoolbase.address, {
            from: admin
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const libraryAddress = await poolbaseCloneFactory.libraryAddress();
        libraryAddress.should.be.equal(poolbase.address);
      });

      it("does NOT allow owner to set an empty address as a library address", async () => {
        try {
          await poolbaseCloneFactory.setLibraryAddress(
            "0x0000000000000000000000000000000000000000",
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const libraryAddress = await poolbaseCloneFactory.libraryAddress();
        libraryAddress.should.be.equal(poolbase.address);
      });

      it("allows owner to set new library address", async () => {
        await poolbaseCloneFactory.setLibraryAddress(newPoolbase.address, {
          from: owner
        });

        const libraryAddress = await poolbaseCloneFactory.libraryAddress();
        libraryAddress.should.be.equal(newPoolbase.address);
      });
    });

    describe("#setPoolbasePayoutWallet", () => {
      it("does NOT allow a NON owner to set poolbasePayoutWallet", async () => {
        try {
          await poolbaseCloneFactory.setPoolbasePayoutWallet(
            poolbasePayoutWallet,
            { from: admin }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbasePayoutWallet_ = await poolbaseCloneFactory.getPoolbasePayoutWallet();
        poolbasePayoutWallet_.should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("does NOT allow a owner to set empty address as a super bouncer", async () => {
        try {
          await poolbaseCloneFactory.setPoolbasePayoutWallet(
            "0x0000000000000000000000000000000000000000",
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbasePayoutWallet_ = await poolbaseCloneFactory.getPoolbasePayoutWallet();
        poolbasePayoutWallet_.should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("allows owner to set poolbasePayoutWallet", async () => {
        await poolbaseCloneFactory.setPoolbasePayoutWallet(
          poolbasePayoutWallet,
          {
            from: owner
          }
        );

        const poolbasePayoutWallet_ = await poolbaseCloneFactory.getPoolbasePayoutWallet();
        poolbasePayoutWallet_.should.be.equal(poolbasePayoutWallet);
      });
    });

    describe("#setPoolbaseFee", () => {
      it("does NOT allow a NON owner to set poolbaseFee", async () => {
        try {
          await poolbaseCloneFactory.setPoolbaseFee([1, 2], {
            from: admin
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbaseFee = await poolbaseCloneFactory.getPoolbaseFee();
        poolbaseFee[0].should.be.bignumber.equal(0);
        poolbaseFee[1].should.be.bignumber.equal(0);
      });

      it("does NOT allow a owner to set empty address as a super bouncer", async () => {
        try {
          await poolbaseCloneFactory.setPoolbaseFee([0, 2], {
            from: owner
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const poolbaseFee = await poolbaseCloneFactory.getPoolbaseFee();
        poolbaseFee[0].should.be.bignumber.equal(0);
        poolbaseFee[1].should.be.bignumber.equal(0);
      });

      it("allows owner to set poolbaseFee", async () => {
        await poolbaseCloneFactory.setPoolbaseFee([1, 2], {
          from: owner
        });

        const poolbaseFee = await poolbaseCloneFactory.getPoolbaseFee();
        poolbaseFee[0].should.be.bignumber.equal(1);
        poolbaseFee[1].should.be.bignumber.equal(2);
      });
    });

    describe("poobase clone factory contract deployment", () => {
      beforeEach(async () => {
        await poolbaseCloneFactory.setPoolbasePayoutWallet(
          poolbasePayoutWallet
        );
        await poolbaseCloneFactory.setPoolbaseFee([1, 2]);
      });

      it("deploys new poolbase contract", async () => {
        const poolTx = await poolbaseCloneFactory.create.call(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2]
        );

        expect(poolTx).to.exist;
      });

      it("emits ContractInstantiation", async () => {
        const { logs } = await poolbaseCloneFactory.create(
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

        const isInstantiation = await poolbaseCloneFactory.isInstantiation.call(
          instantiation
        );
        isInstantiation.should.be.true;

        expect(hashMessage).to.exist;
      });

      it("registers the number of poolbase contract deployed per address", async () => {
        const poolbase = await poolbaseCloneFactory.create(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

        let numberOfInstantiations = await poolbaseCloneFactory.getInstantiationCount(
          owner
        );
        numberOfInstantiations.should.be.bignumber.equal(1);

        const poolbase2 = await poolbaseCloneFactory.create(
          maxAllocation,
          adminPoolFee,
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

        numberOfInstantiations = await poolbaseCloneFactory.getInstantiationCount(
          owner
        );
        numberOfInstantiations.should.be.bignumber.equal(2);
      });
    });
  }
);
