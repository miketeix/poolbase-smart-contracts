const Poolbase = artifacts.require('./Poolbase.sol');
const TokenMock = artifacts.require('./TokenMock.sol');
const BigNumber = web3.BigNumber;

const { latestTime, duration, increaseTimeTo } = require('./helpers/timer');
const { should, ensuresException, ether } = require('./helpers/utils');

// contract(
//     'Poolbase',
//     ([owner, wallet, investor1, investor2, investor3, beneficiary]) => {
//         let felixPool, vault, endTime;
//         let start, token, cliff, length;
//
//         const threshold = ether(10);
//         const cap = ether(20);
//         const rate = new BigNumber(2);
//
//         beforeEach(async () => {
//             endTime = latestTime() + duration.days(20); // 20 days
//             felixPool = await Poolbase.new(
//                 threshold,
//                 cap,
//                 endTime,
//                 rate,
//                 wallet
//             );
//             const vaultAddress = await felixPool.vault();
//             vault = await RefundVault.at(vaultAddress);
//         });
//
//         describe('constructor sets variables', () => {
//             it('sets the pool threshold', async () => {
//                 const thresholdInContract = await felixPool.threshold();
//                 thresholdInContract.should.be.bignumber.equal(threshold);
//             });
//
//             it('sets the pool cap', async () => {
//                 const capInContract = await felixPool.cap();
//                 capInContract.should.be.bignumber.equal(cap);
//             });
//
//             it('sets endTime', async () => {
//                 const endTimeInContract = await felixPool.endTime();
//                 endTimeInContract.should.be.bignumber.equal(endTime);
//             });
//
//             it('sets admin', async () => {
//                 const admin = await felixPool.admin();
//                 admin.should.be.bignumber.equal(owner);
//             });
//
//             it('sets rate', async () => {
//                 const rateInContract = await felixPool.rate();
//                 rateInContract.should.be.bignumber.equal(rate);
//             });
//
//             it('creates refund vault contract with a wallet', async () => {
//                 const refundVaultInContract = await felixPool.vault();
//                 refundVaultInContract.should.be.equal(vault.address);
//
//                 const vaultWallet = await vault.wallet();
//                 vaultWallet.should.be.equal(wallet);
//             });
//         });
//
//         describe('#invest', () => {
//             it('does NOT allow investments after the pool finishes', async () => {
//                 await increaseTimeTo(latestTime() + duration.days(21));
//
//                 try {
//                     await felixPool.invest({
//                         from: investor1,
//                         value: ether(1)
//                     });
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(0);
//             });
//
//             it('does NOT allow investments once the pool cap is reached', async () => {
//                 await felixPool.invest({ from: investor3, value: ether(20) });
//
//                 try {
//                     await felixPool.invest({
//                         from: investor2,
//                         value: ether(1)
//                     });
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(20));
//             });
//
//             it('saves the number of deposit an investor has made', async () => {
//                 await felixPool.invest({ from: investor1, value: ether(1) });
//
//                 let weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(1));
//                 let investorContributions = await vault.deposited.call(
//                     investor1
//                 );
//                 investorContributions.should.be.bignumber.equal(ether(1));
//
//                 await felixPool.invest({ from: investor1, value: ether(3) });
//
//                 weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(4));
//                 investorContributions = await vault.deposited.call(investor1);
//                 investorContributions.should.be.bignumber.equal(ether(4));
//             });
//
//             it('allows total contribution to be sent by sending ether to the contract directly', async () => {
//                 await felixPool.sendTransaction({
//                     from: investor1,
//                     value: ether(1)
//                 });
//
//                 let weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(1));
//                 let investorContributions = await vault.deposited.call(
//                     investor1
//                 );
//                 investorContributions.should.be.bignumber.equal(ether(1));
//
//                 await felixPool.sendTransaction({
//                     from: investor1,
//                     value: ether(3)
//                 });
//
//                 weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(4));
//                 investorContributions = await vault.deposited.call(investor1);
//                 investorContributions.should.be.bignumber.equal(ether(4));
//             });
//
//             it('saves the tokens entitlements for an investor after it has contributed', async () => {
//                 await felixPool.invest({ from: investor1, value: ether(1) });
//
//                 let totalTokens = await felixPool.totalTokens();
//                 totalTokens.should.be.bignumber.equal(ether(1).mul(rate));
//                 let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
//                     investor1
//                 );
//                 investorTokenEntitlements.should.be.bignumber.equal(
//                     ether(1).mul(rate)
//                 );
//
//                 await felixPool.invest({ from: investor1, value: ether(3) });
//
//                 totalTokens = await felixPool.totalTokens();
//                 totalTokens.should.be.bignumber.equal(ether(4).mul(rate));
//                 investorTokenEntitlements = await felixPool.tokenEntitlements.call(
//                     investor1
//                 );
//                 investorTokenEntitlements.should.be.bignumber.equal(
//                     ether(4).mul(rate)
//                 );
//             });
//
//             it('emits ContributionMade event', async () => {
//                 const { logs } = await felixPool.invest({
//                     from: investor1,
//                     value: ether(1)
//                 });
//
//                 const event = logs.find(e => e.event == 'ContributionMade');
//                 expect(event).to.exist;
//
//                 const { args } = logs[0];
//                 const { investor, contribution } = args;
//
//                 investor.should.be.equal(investor1);
//                 contribution.should.be.bignumber.equal(ether(1));
//             });
//         });
//
//         describe('#claimRefund', () => {
//             const totalTokensForPool = threshold.mul(rate);
//
//             beforeEach(async () => {
//                 start = latestTime() + duration.days(22);
//                 cliff = duration.years(1);
//                 length = duration.years(2);
//                 token = await TokenMock.new(
//                     felixPool.address,
//                     totalTokensForPool
//                 );
//             });
//
//             it('does NOT allow investment withdraws when investor has not contributed', async () => {
//                 await increaseTimeTo(latestTime() + duration.days(21));
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length
//                 );
//
//                 let investorContributions = await vault.deposited.call(
//                     investor1
//                 );
//                 investorContributions.should.be.bignumber.equal(0);
//
//                 await felixPool.claimRefund({ from: investor1 });
//
//                 const weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(0);
//
//                 investorContributions = await vault.deposited.call(investor1);
//                 investorContributions.should.be.bignumber.equal(0);
//             });
//
//             it('does NOT allow withdraws when the pool is successful', async () => {
//                 await felixPool.invest({ from: investor1, value: threshold });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length,
//                     {
//                         from: owner
//                     }
//                 );
//
//                 try {
//                     await felixPool.claimRefund({ from: investor1 });
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(threshold);
//
//                 const investorContributions = await vault.deposited.call(
//                     investor1
//                 );
//                 investorContributions.should.be.bignumber.equal(threshold);
//             });
//
//             it('does NOT allow withdraws when the pool is not finalized', async () => {
//                 await felixPool.invest({ from: investor1, value: threshold });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//
//                 try {
//                     await felixPool.claimRefund({ from: investor1 });
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(threshold);
//
//                 const investorContributions = await vault.deposited.call(
//                     investor1
//                 );
//                 investorContributions.should.be.bignumber.equal(threshold);
//             });
//
//             it('withdraws contributions an investor has made', async () => {
//                 await felixPool.invest({ from: investor1, value: ether(2) });
//                 await felixPool.invest({ from: investor2, value: ether(1) });
//
//                 let weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(3));
//
//                 let investorContributions = await vault.deposited.call(
//                     investor1
//                 );
//                 investorContributions.should.be.bignumber.equal(ether(2));
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length
//                 );
//
//                 await felixPool.claimRefund({ from: investor1 });
//
//                 weiRaised = await felixPool.weiRaised();
//                 weiRaised.should.be.bignumber.equal(ether(1));
//
//                 investorContributions = await vault.deposited.call(investor1);
//                 investorContributions.should.be.bignumber.equal(0);
//
//                 const investor2Contributions = await vault.deposited.call(
//                     investor2
//                 );
//                 investor2Contributions.should.be.bignumber.equal(ether(1));
//             });
//
//             it('resets token entitlements for investors who have withdrawn their investments', async () => {
//                 await felixPool.invest({ from: investor1, value: ether(2) });
//                 await felixPool.invest({ from: investor2, value: ether(1) });
//
//                 let totalTokens = await felixPool.totalTokens();
//                 totalTokens.should.be.bignumber.equal(ether(3).mul(rate));
//                 let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
//                     investor1
//                 );
//                 investorTokenEntitlements.should.be.bignumber.equal(
//                     ether(2).mul(rate)
//                 );
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length
//                 );
//
//                 await felixPool.claimRefund({ from: investor1 });
//
//                 totalTokens = await felixPool.totalTokens();
//                 totalTokens.should.be.bignumber.equal(ether(1).mul(rate));
//                 investorTokenEntitlements = await felixPool.tokenEntitlements.call(
//                     investor1
//                 );
//                 investorTokenEntitlements.should.be.bignumber.equal(0);
//
//                 const investor2TokenEntitlements = await felixPool.tokenEntitlements.call(
//                     investor2
//                 );
//                 investor2TokenEntitlements.should.be.bignumber.equal(
//                     ether(1).mul(rate)
//                 );
//             });
//
//             it('transfers wei investment back to the investor', async () => {
//                 const investorWeiBalance = web3.eth.getBalance(investor1);
//                 await felixPool.invest({ from: investor1, value: ether(5) });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length
//                 );
//
//                 await felixPool.claimRefund({ from: investor1 });
//
//                 const investorWeiBalancePostInteraction = web3.eth.getBalance(
//                     investor1
//                 );
//
//                 investorWeiBalancePostInteraction
//                     .toNumber()
//                     .should.be.closeTo(investorWeiBalance.toNumber(), 1e17);
//             });
//
//             it('emits Refunded event', async () => {
//                 await felixPool.invest({
//                     from: investor1,
//                     value: ether(1)
//                 });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length
//                 );
//
//                 const { logs } = await vault.refund(investor1, {
//                     from: investor1
//                 });
//
//                 const event = logs.find(e => e.event == 'Refunded');
//                 expect(event).to.exist;
//
//                 const { args } = logs[0];
//                 const { beneficiary, weiAmount } = args;
//
//                 beneficiary.should.be.equal(investor1);
//                 weiAmount.should.be.bignumber.equal(ether(1));
//             });
//         });
//
//         describe('#finalizePool', () => {
//             const totalTokensForPool = threshold.mul(rate);
//
//             beforeEach(async () => {
//                 start = latestTime() + duration.days(22);
//                 cliff = duration.years(1);
//                 length = duration.years(2);
//                 token = await TokenMock.new(
//                     felixPool.address,
//                     totalTokensForPool
//                 );
//             });
//
//             it('requires admin to set token address', async () => {
//                 await felixPool.invest({
//                     from: investor1,
//                     value: threshold
//                 });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//
//                 try {
//                     await felixPool.finalizePool(
//                         token.address,
//                         start,
//                         cliff,
//                         length,
//                         {
//                             from: investor1
//                         }
//                     );
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const tokenContract = await felixPool.token();
//                 tokenContract.should.be.equal(
//                     '0x0000000000000000000000000000000000000000'
//                 );
//             });
//
//             it('requires pool to have finished', async () => {
//                 await felixPool.invest({
//                     from: investor1,
//                     value: threshold
//                 });
//
//                 try {
//                     await felixPool.finalizePool(
//                         token.address,
//                         start,
//                         cliff,
//                         length,
//                         {
//                             from: owner
//                         }
//                     );
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const tokenContract = await felixPool.token();
//                 tokenContract.should.be.equal(
//                     '0x0000000000000000000000000000000000000000'
//                 );
//             });
//
//             it('requires equal or more tokens sent to pool contract', async () => {
//                 // eRC20 tokens for tranferred to felixPool is lower than
//                 // the totalTokens felixPool expects
//                 await felixPool.invest({
//                     from: investor1,
//                     value: threshold.add(ether(1))
//                 });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//
//                 try {
//                     await felixPool.finalizePool(
//                         token.address,
//                         start,
//                         cliff,
//                         length,
//                         {
//                             from: owner
//                         }
//                     );
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 const tokenContract = await felixPool.token();
//                 tokenContract.should.be.equal(
//                     '0x0000000000000000000000000000000000000000'
//                 );
//             });
//
//             it('sets ERC20 token to pool', async () => {
//                 await felixPool.invest({
//                     from: investor1,
//                     value: threshold
//                 });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length,
//                     {
//                         from: owner
//                     }
//                 );
//
//                 const startContract = await felixPool.start();
//                 startContract.should.be.bignumber.equal(start);
//
//                 const cliffContract = await felixPool.cliff();
//                 cliffContract.toNumber().should.be.equal(cliff + start);
//
//                 const durationContract = await felixPool.duration();
//                 durationContract.should.be.bignumber.equal(length);
//
//                 const erc20InPool = await felixPool.token();
//                 erc20InPool.should.be.equal(token.address);
//             });
//         });
//
//         describe('#release', () => {
//             const totalTokensForPool = threshold.mul(rate);
//
//             beforeEach(async () => {
//                 start = latestTime() + duration.days(22);
//                 cliff = duration.years(1);
//                 length = duration.years(2);
//                 token = await TokenMock.new(
//                     felixPool.address,
//                     totalTokensForPool
//                 );
//
//                 await felixPool.invest({
//                     from: beneficiary,
//                     value: threshold
//                 });
//
//                 await increaseTimeTo(latestTime() + duration.days(21));
//
//                 await felixPool.finalizePool(
//                     token.address,
//                     start,
//                     cliff,
//                     length,
//                     {
//                         from: owner
//                     }
//                 );
//             });
//
//             it('cannot be released before cliff', async () => {
//                 try {
//                     await felixPool.release({ from: beneficiary });
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//             });
//
//             it('can be released after cliff', async () => {
//                 await increaseTimeTo(start + cliff + duration.weeks(1));
//                 await felixPool.release({ from: beneficiary }).should.be
//                     .fulfilled;
//             });
//
//             it('should release proper amount after cliff', async () => {
//                 await increaseTimeTo(start + cliff);
//
//                 const { receipt } = await felixPool.release({
//                     from: beneficiary
//                 });
//                 const releaseTime = web3.eth.getBlock(receipt.blockNumber)
//                     .timestamp;
//
//                 const balance = await token.balanceOf(beneficiary);
//                 balance.should.bignumber.equal(
//                     totalTokensForPool
//                         .mul(releaseTime - start)
//                         .div(length)
//                         .floor()
//                 );
//             });
//
//             it('cannot release token twice for the same time period', async () => {
//                 await increaseTimeTo(start + cliff);
//
//                 const { receipt } = await felixPool.release({
//                     from: beneficiary
//                 });
//                 const releaseTime = web3.eth.getBlock(receipt.blockNumber)
//                     .timestamp;
//
//                 let balance = await token.balanceOf(beneficiary);
//                 balance.should.bignumber.equal(
//                     totalTokensForPool
//                         .mul(releaseTime - start)
//                         .div(length)
//                         .floor()
//                 );
//
//                 // attempt another claim right after first one. All in all token balance must be the same
//                 try {
//                     await felixPool.release({ from: beneficiary });
//                     assert.fail();
//                 } catch (e) {
//                     ensuresException(e);
//                 }
//
//                 balance = await token.balanceOf(beneficiary);
//                 balance.should.bignumber.equal(
//                     totalTokensForPool
//                         .mul(releaseTime - start)
//                         .div(length)
//                         .floor()
//                 );
//             });
//
//             it('should linearly release tokens during vesting period', async () => {
//                 const vestingPeriod = length - cliff;
//                 const checkpoints = 4;
//
//                 for (let i = 1; i <= checkpoints; i++) {
//                     const now =
//                         start + cliff + i * (vestingPeriod / checkpoints);
//                     await increaseTimeTo(now);
//
//                     await felixPool.release({ from: beneficiary });
//                     const balance = await token.balanceOf(beneficiary);
//                     const expectedVesting = totalTokensForPool
//                         .mul(now - start)
//                         .div(length)
//                         .floor();
//
//                     balance
//                         .toNumber()
//                         .should.be.closeTo(expectedVesting.toNumber(), 1e16);
//                 }
//             });
//
//             it('should have released all after end', async () => {
//                 await increaseTimeTo(start + length);
//                 await felixPool.release({ from: beneficiary });
//                 const balance = await token.balanceOf(beneficiary);
//                 balance.should.bignumber.equal(totalTokensForPool);
//             });
//         });
//     }
// );
