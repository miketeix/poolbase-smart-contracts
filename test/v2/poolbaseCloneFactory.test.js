const { ensuresException } = require("../helpers/utils");
const PoolbaseCloneFactory = artifacts.require("./PoolbaseCloneFactory.sol");
const Poolbase = artifacts.require("./Poolbase.sol");

const BigNumber = web3.BigNumber;

contract(
  "PoolbaseCloneFactory",
  ([
    owner,
    bouncer,
    bouncer2,
    bouncer3,
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
    const poolbaseFee = [2, 5];

    beforeEach(async () => {
      poolbase = await Poolbase.new();
      poolbaseCloneFactory = await PoolbaseCloneFactory.new(poolbase.address);
      newPoolbase = await Poolbase.new();
    });

    describe("#setLibraryAddress", () => {
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

    describe("#setSuperBouncers", () => {
      it("does NOT allow a NON owner to set superBouncers", async () => {
        const bouncers = [bouncer, bouncer2];
        // possible bug with web3 as it cannot catch exception when func params is an array of addresses
        try {
          await poolbaseCloneFactory.setSuperBouncers(bouncers, {
            from: admin
          });
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }
        const superBouncers = await poolbaseCloneFactory.getSuperBouncers();
        superBouncers[0].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
        superBouncers[1].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("does NOT allow a owner to set empty address as a super bouncer", async () => {
        // possible bug with web3 as it cannot catch exception when func params is an array of addresses
        try {
          await poolbaseCloneFactory.setSuperBouncers(
            ["0x0000000000000000000000000000000000000000", bouncer2],
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }
        const superBouncers = await poolbaseCloneFactory.getSuperBouncers();
        superBouncers[0].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
        superBouncers[1].should.be.equal(
          "0x0000000000000000000000000000000000000000"
        );
      });

      it("allows owner to set superBouncers", async () => {
        await poolbaseCloneFactory.setSuperBouncers([bouncer, bouncer2], {
          from: owner
        });

        const superBouncers = await poolbaseCloneFactory.getSuperBouncers();

        superBouncers[0].should.be.equal(bouncer);
        superBouncers[1].should.be.equal(bouncer2);
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

      it("does NOT allow a owner to set empty address for payoutWallet", async () => {
        try {
          await poolbaseCloneFactory.setPoolbasePayoutWallet(
            "0x0000000000000000000000000000000000000000",
            { from: owner }
          );
          assert.fail();
        } catch (e) {
          ensuresException(e);
        }
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

    context("with vars set for poolbase contract creation", () => {
      beforeEach(async () => {
        await poolbaseCloneFactory.setSuperBouncers([bouncer, bouncer2]);

        await poolbaseCloneFactory.setPoolbasePayoutWallet(
          poolbasePayoutWallet
        );
      });

      describe("poolbase clone factory contract deployment", () => {
        it("does not matter whether libraryAddress reference has values initialized, the factory produces a clone from how the libraryAddress was originally deployed", async () => {
          await poolbase.init(
            [bouncer, bouncer2],
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
            poolbaseFee,
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
          await newPoolbase.init(
            [bouncer, bouncer2],
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
              poolbaseFee,
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
          const poolTx = await poolbaseCloneFactory.create(
            maxAllocation,
            adminPoolFee,
            poolbaseFee,
            isAdminFeeInWei,
            payoutWallet,
            adminPayoutWallet,
            eventEmitterContract,
            [admin, admin2]
          );

          expect(poolTx).to.exist;

          const poolAddress = await poolbaseCloneFactory.instantiations.call(
            owner,
            0
          );

          const poolInstance = Poolbase.at(poolAddress);
          const maxAllocationFromLibrary = await poolInstance.maxAllocation();
          maxAllocationFromLibrary.should.be.bignumber.equal(maxAllocation);

          const adminPayoutWalletFromLibrary = await poolInstance.adminPayoutWallet();
          adminPayoutWalletFromLibrary.should.be.bignumber.equal(
            adminPayoutWallet
          );
        });

        it("emits ContractInstantiation", async () => {
          const { logs } = await poolbaseCloneFactory.create(
            maxAllocation,
            adminPoolFee,
            poolbaseFee,
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
            poolbaseFee,
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
            poolbaseFee,
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

      describe("add and remove bouncers from created poolbase contracts", () => {
        beforeEach(async () => {
          await poolbaseCloneFactory.create(
            maxAllocation,
            adminPoolFee,
            poolbaseFee,
            isAdminFeeInWei,
            payoutWallet,
            adminPayoutWallet,
            eventEmitterContract,
            [admin, admin2],
            { from: owner }
          );
          const poolAddress = await poolbaseCloneFactory.instantiations.call(
            owner,
            0
          );

          poolbase = Poolbase.at(poolAddress);
        });

        it("makes poolbaseCloneContract a bouncer for the poolbase contracts", async () => {
          const isBouncer = await poolbase.hasRole(
            poolbaseCloneFactory.address,
            "bouncer"
          );
          isBouncer.should.be.true;
        });

        it("cannot add a bouncer when called by a non-owner", async () => {
          try {
            await poolbaseCloneFactory.addBouncersToAPool(
              bouncer3,
              poolbase.address,
              { from: bouncer3 }
            );
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isBouncer = await poolbase.hasRole(bouncer3, "bouncer");
          isBouncer.should.be.false;

          await poolbaseCloneFactory.addBouncersToAPool(
            bouncer3,
            poolbase.address,
            { from: owner }
          );

          isBouncer = await poolbase.hasRole(bouncer3, "bouncer");
          isBouncer.should.be.true;
        });

        it("cannot add a bouncer with an empty bouncer address", async () => {
          try {
            await poolbaseCloneFactory.addBouncersToAPool(
              "0x0000000000000000000000000000000000000000",
              poolbase.address,
              { from: owner }
            );
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isBouncer = await poolbase.hasRole(
            "0x0000000000000000000000000000000000000000",
            "bouncer"
          );
          isBouncer.should.be.false;

          await poolbaseCloneFactory.addBouncersToAPool(
            bouncer3,
            poolbase.address,
            { from: owner }
          );

          isBouncer = await poolbase.hasRole(bouncer3, "bouncer");
          isBouncer.should.be.true;
        });

        it("adds new bouncer to contract", async () => {
          await poolbaseCloneFactory.addBouncersToAPool(
            bouncer3,
            poolbase.address,
            { from: owner }
          );

          const isBouncer = await poolbase.hasRole(bouncer3, "bouncer");
          isBouncer.should.be.true;
        });

        it("cannot remove a bouncer when called by a non-owner", async () => {
          let isBouncer = await poolbase.hasRole(bouncer2, "bouncer");
          isBouncer.should.be.true;

          try {
            await poolbaseCloneFactory.removeBouncersToAPool(
              bouncer2,
              poolbase.address,
              { from: bouncer3 }
            );
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          isBouncer = await poolbase.hasRole(bouncer2, "bouncer");
          isBouncer.should.be.true;

          await poolbaseCloneFactory.removeBouncersToAPool(
            bouncer2,
            poolbase.address,
            { from: owner }
          );

          isBouncer = await poolbase.hasRole(bouncer2, "bouncer");
          isBouncer.should.be.false;
        });

        it("cannot remove a bouncer with an empty bouncer address", async () => {
          try {
            await poolbaseCloneFactory.removeBouncersToAPool(
              "0x0000000000000000000000000000000000000000",
              poolbase.address,
              { from: owner }
            );
            assert.fail();
          } catch (e) {
            ensuresException(e);
          }

          let isBouncer = await poolbase.hasRole(
            "0x0000000000000000000000000000000000000000",
            "bouncer"
          );
          isBouncer.should.be.false;
        });

        it("removes new bouncer to contract", async () => {
          let isBouncer = await poolbase.hasRole(bouncer2, "bouncer");
          isBouncer.should.be.true;

          await poolbaseCloneFactory.removeBouncersToAPool(
            bouncer2,
            poolbase.address,
            { from: owner }
          );

          isBouncer = await poolbase.hasRole(bouncer2, "bouncer");
          isBouncer.should.be.false;
        });
      });
    });
  }
);
