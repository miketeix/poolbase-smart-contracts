var fs = require("fs");
var path = require("path");

const PoolbaseFactory = artifacts.require("./PoolbaseCloneFactory");
const PoolbaseEventEmitter = artifacts.require("./PoolbaseEventEmitter");
const PoolContract = artifacts.require("./Poolbase");
const addressesPath = path.join(__dirname, "../addresses");

const superBouncerSignerAddress = '0xc269e92892A1DFc71E4667dA6f7e6A44f1706615';

module.exports = async function(
  deployer,
  network,
  [coinbaseAccount, poolAdmin, superBouncer]
) {
  // deploy contracts
  await deployer.deploy(PoolContract);
  await deployer.deploy(PoolbaseFactory, PoolContract.address);
  await deployer.deploy(PoolbaseEventEmitter);

// set up files for contract addresses
  writeAddressFile(PoolContract, "poolbaseCloneLibrary");
  writeAddressFile(PoolbaseFactory, "poolbaseFactory");
  writeAddressFile(PoolbaseEventEmitter, "poolbaseEventEmitter");

  // setting up PoolbaseCloneFactory
  const factoryInstance = await PoolbaseFactory.at(PoolbaseFactory.address);

  await factoryInstance.setSuperBouncers([coinbaseAccount, superBouncerSignerAddress], {
    from: coinbaseAccount
  });

  await factoryInstance.setPoolbasePayoutWallet(coinbaseAccount, {
    from: coinbaseAccount
  });

  const poolbaseFee = [5, 1000];
  const poolParams = {
    maxAllocation: 200e18,
    adminPoolFee: [5, 1000],
    poolbaseFee,
    isAdminFeeInWei: true,
    payoutWallet: coinbaseAccount,
    adminPayoutWallet: poolAdmin,
    eventEmitterContract: PoolbaseEventEmitter.address,
    admins: [poolAdmin]
  };
  const params = [...Object.values(poolParams)];

  // creates a pool
  await factoryInstance.create(...params, {
    from: coinbaseAccount
  });

  const poolAddress = await factoryInstance.instantiations.call(
    coinbaseAccount,
    0
  );
  // pool that was created
  const poolInstance = PoolContract.at(poolAddress);
<<<<<<< HEAD
  // checking for bouncers
  const isSuperBouncer = await poolInstance.hasRole(superBouncerSignerAddress, "bouncer");
  const isCoinbaseAccountSuperBouncer = await poolInstance.hasRole(
    coinbaseAccount,
    "bouncer"
  );
  console.log({ isSuperBouncer, isCoinbaseAccountSuperBouncer });
};

const writeAddressFile = (contract, filename) => {
  fs.writeFile(`${addressesPath}/${filename}`, contract.address, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("The filename file was saved!");
  });
};
