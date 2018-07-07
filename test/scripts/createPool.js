/* **** Truffle exec script run using the command:
    truffle exec ./test/scripts/createPool.js
**** */

const fs = require('fs');
const Web3 = require('web3');

//poolbase
const factoryArtifact = require('../../build/contracts/PoolbaseFactory.json');
const poolbaseArtifact = require('../../build/contracts/Poolbase.json');
const eventEmitterAddress = fs.readFileSync('../../addresses/poolbaseEventEmitter', 'utf8');
const factoryAddress = fs.readFileSync('../../addresses/poolbaseFactory', 'utf8');

module.exports = async function(callback) {
  // perform actions
  const web3 = new Web3('http://localhost:8545');
  console.log('web3.version', web3.version);
  const [coinbaseAccount, poolAdmin] = await web3.eth.getAccounts();


  console.log('factoryAddress', factoryAddress);
  const poolFactory = new web3.eth.Contract(factoryArtifact.abi, factoryAddress, {
      from: coinbaseAccount, // default from address
      gasPrice: '20000000000' // default gas price in wei, 20 gwei in this case
  });

  const poolParams = {
      superBouncers: [coinbaseAccount],
      maxAllocation: 200e18,
      adminPoolFee: [5, 1000],
      poolbaseFee: [5, 1000],
      isAdminFeeInWei: true,
      payoutWallet: coinbaseAccount,
      adminPayoutWallet: poolAdmin,
      poolbasePayoutWallet: coinbaseAccount,
      eventEmitterContract: eventEmitterAddress,
      admins: [poolAdmin]
  };

  const params = [...Object.values(poolParams)];
  //
  const {
    events: {
      ContractInstantiation: {
        returnValues: {
          instantiation: poolAddress
        }
      }
    }
  } = await poolFactory.methods.create(...params).send({
    from: coinbaseAccount,
    gas: 5000000,
    gasPrice: '20000000000'
  });

  console.log('poolAddress', poolAddress);

  const instantiationCount = await poolFactory.methods.getInstantiationCount(coinbaseAccount).call();
  console.log('instantiationCount', instantiationCount.toString());

  callback();
}
