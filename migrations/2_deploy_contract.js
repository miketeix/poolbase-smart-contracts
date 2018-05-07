const FelixPool = artifacts.require('./FelixPool');
const BigNumber = web3.BigNumber;

const threshold = new BigNumber(100);
const startTime = web3.eth.getBlock('latest').timestamp + 24; // twenty secs in the future
const endTime = startTime + 86400 * 20; // 20 days
const rate = new BigNumber(10);

module.exports = function(deployer, network, [admin]) {
    deployer.deploy(FelixPool, threshold, startTime, endTime, rate);
};
