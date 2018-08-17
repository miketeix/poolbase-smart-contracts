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

    describe("poolbase clone factory contract deployment", () => {
      beforeEach(async () => {
        await poolbaseCloneFactory.setPoolbasePayoutWallet(
          poolbasePayoutWallet
        );
        await poolbaseCloneFactory.setPoolbaseFee([1, 2]);
      });

      it("does not matter whehter libraryAddress reference has values initialized, the factory produces a clone from how the libraryAddress is originally", async () => {
        await poolbase.init(
          new BigNumber(100),
          adminPoolFee,
          [1, 2],
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          poolbasePayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

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

        const { args } = logs[0];
        const { instantiation } = args;

        const deployedPoolBaseFromFactory = Poolbase.at(instantiation);

        const maxAllocationFromDeployedPoolbaseFromFactory = await deployedPoolBaseFromFactory.maxAllocation();
        maxAllocationFromDeployedPoolbaseFromFactory.should.be.bignumber.equal(
          maxAllocation
        );

        const maxAllocationFromLibrary = await poolbase.maxAllocation();
        maxAllocationFromLibrary.should.be.bignumber.equal(100);
      });

      it("matters when librayAddress has initialized values before being part of the cloneFactory", async () => {
        const newPoolbase = await Poolbase.new([bouncer, bouncer2]);
        await newPoolbase.init(
          new BigNumber(100),
          adminPoolFee,
          [1, 2],
          isAdminFeeInWei,
          payoutWallet,
          adminPayoutWallet,
          poolbasePayoutWallet,
          eventEmitterContract,
          [admin, admin2],
          { from: owner }
        );

        const newPoolbaseCloneFactory = await PoolbaseCloneFactory.new(
          newPoolbase.address
        );

        // here the clone factory does not work anymore as expected
        // throws the error Error: VM Exception while processing transaction: revert Global variables should have not been set before and params variables cannot be empty but payoutWallet
        try {
          await newPoolbaseCloneFactory.create(
            maxAllocation,
            adminPoolFee,
            isAdminFeeInWei,
            payoutWallet,
            adminPayoutWallet,
            eventEmitterContract,
            [admin, admin2],
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }

        const maxAllocationFromLibrary = await newPoolbase.maxAllocation();
        maxAllocationFromLibrary.should.be.bignumber.equal(100);
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
        await poolbaseCloneFactory.create(
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

        await poolbaseCloneFactory.create(
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
