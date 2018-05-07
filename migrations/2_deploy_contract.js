const FelixPool = artifacts.require('./FelixPool');
const BigNumber = web3.BigNumber;

const threshold = new BigNumber(100);
const endTime = web3.eth.getBlock('latest').timestamp + 86400 * 20; // 20 days
const rate = new BigNumber(10);

module.exports = function(deployer, network, [admin]) {
    deployer.deploy(FelixPool, threshold, endTime, rate);
};
