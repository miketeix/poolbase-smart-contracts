var fs = require("fs");
var path = require("path");

const PoolbaseFactory = artifacts.require("./PoolbaseCloneFactory");
const PoolbaseEventEmitter = artifacts.require("./PoolbaseEventEmitter");
const PoolContract = artifacts.require("./PoolbaseV2");
const addressesPath = path.join(__dirname, "../addresses");

module.exports = async function(
  deployer,
  network,
  [coinbaseAccount, poolAdmin, superBouncer]
) {
  await deployer.deploy(PoolContract);
  await deployer.deploy(PoolbaseFactory, PoolContract.address);
  await deployer.deploy(PoolbaseEventEmitter);

  writeAddressFile(PoolContract, "poolbaseCloneLibrary");
  writeAddressFile(PoolbaseFactory, "poolbaseFactory");
  writeAddressFile(PoolbaseEventEmitter, "poolbaseEventEmitter");

  const factoryInstance = await PoolbaseFactory.at(PoolbaseFactory.address);

  await factoryInstance.setSuperBouncers([coinbaseAccount, superBouncer], {
    from: coinbaseAccount
  });

  await factoryInstance.setPoolbasePayoutWallet(coinbaseAccount, {
    from: coinbaseAccount
  });

  await factoryInstance.setPoolbaseFee([5, 1000], { from: coinbaseAccount });

  const poolParams = {
    maxAllocation: 200e18,
    adminPoolFee: [5, 1000],
    isAdminFeeInWei: true,
    payoutWallet: coinbaseAccount,
    adminPayoutWallet: poolAdmin,
    eventEmitterContract: PoolbaseEventEmitter.address,
    admins: [poolAdmin]
  };
  const params = [...Object.values(poolParams)];

  await factoryInstance.create(...params, {
    from: coinbaseAccount
  });

  const poolAddress = await factoryInstance.instantiations.call(
    coinbaseAccount,
    0
  );

  const poolInstance = PoolContract.at(poolAddress);

  const isSuperBouncer = await poolInstance.hasRole(superBouncer, "bouncer");
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
