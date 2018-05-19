const FelixPool = artifacts.require('./FelixPool.sol');
const RefundVault = artifacts.require('./RefundVault.sol');
const TokenMock = artifacts.require('./TokenMock.sol');
const BigNumber = web3.BigNumber;

const { latestTime, duration, increaseTimeTo } = require('./helpers/timer');
const { should, ensuresException, ether } = require('./helpers/utils');

contract('FelixPool', ([owner, wallet, investor1, investor2, investor3]) => {
    let felixPool, vault, endTime;

    const threshold = ether(10);
    const cap = ether(20);
    const rate = new BigNumber(2);

    beforeEach(async () => {
        endTime = latestTime() + duration.days(20); // 20 days
        felixPool = await FelixPool.new(threshold, cap, endTime, rate, wallet);
        const vaultAddress = await felixPool.vault();
        vault = await RefundVault.at(vaultAddress);
    });

    describe('constructor sets variables', () => {
        it('sets the pool threshold', async () => {
            const thresholdInContract = await felixPool.threshold();
            thresholdInContract.should.be.bignumber.equal(threshold);
        });

        it('sets the pool cap', async () => {
            const capInContract = await felixPool.cap();
            capInContract.should.be.bignumber.equal(cap);
        });

        it('sets endTime', async () => {
            const endTimeInContract = await felixPool.endTime();
            endTimeInContract.should.be.bignumber.equal(endTime);
        });

        it('sets admin', async () => {
            const admin = await felixPool.admin();
            admin.should.be.bignumber.equal(owner);
        });

        it('sets rate', async () => {
            const rateInContract = await felixPool.rate();
            rateInContract.should.be.bignumber.equal(rate);
        });

        it('creates refund vault contract with a wallet', async () => {
            const refundVaultInContract = await felixPool.vault();
            refundVaultInContract.should.be.equal(vault.address);

            const vaultWallet = await vault.wallet();
            vaultWallet.should.be.equal(wallet);
        });
    });

    describe('#invest', () => {
        it('does NOT allow investments after the pool finishes', async () => {
            await increaseTimeTo(latestTime() + duration.days(21));

            try {
                await felixPool.invest({ from: investor1, value: ether(1) });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(0);
        });

        it('does NOT allow investments once the pool cap is reached', async () => {
            await felixPool.invest({ from: investor3, value: ether(20) });

            try {
                await felixPool.invest({ from: investor2, value: ether(1) });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(20));
        });

        it('saves the number of deposit an investor has made', async () => {
            await felixPool.invest({ from: investor1, value: ether(1) });

            let weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(1));
            let investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(ether(1));

            await felixPool.invest({ from: investor1, value: ether(3) });

            weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(4));
            investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(ether(4));
        });

        it('allows total contribution to be sent by sending ether to the contract directly', async () => {
            await felixPool.sendTransaction({
                from: investor1,
                value: ether(1)
            });

            let weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(1));
            let investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(ether(1));

            await felixPool.sendTransaction({
                from: investor1,
                value: ether(3)
            });

            weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(4));
            investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(ether(4));
        });

        it('saves the tokens entitlements for an investor after it has contributed', async () => {
            await felixPool.invest({ from: investor1, value: ether(1) });

            let totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(1).mul(rate));
            let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(
                ether(1).mul(rate)
            );

            await felixPool.invest({ from: investor1, value: ether(3) });

            totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(4).mul(rate));
            investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(
                ether(4).mul(rate)
            );
        });

        it('emits ContributionMade event', async () => {
            const { logs } = await felixPool.invest({
                from: investor1,
                value: ether(1)
            });

            const event = logs.find(e => e.event == 'ContributionMade');
            expect(event).to.exist;

            const { args } = logs[0];
            const { investor, contribution } = args;

            investor.should.be.equal(investor1);
            contribution.should.be.bignumber.equal(ether(1));
        });
    });

    describe('#claimRefund', () => {
        let token;
        const totalTokensForPool = threshold.mul(rate);

        beforeEach(async () => {
            token = await TokenMock.new(felixPool.address, totalTokensForPool);
        });

        it('does NOT allow investment withdraws when investor has not contributed', async () => {
            await increaseTimeTo(latestTime() + duration.days(21));
            await felixPool.finalizePool(token.address);

            let investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(0);

            await felixPool.claimRefund({ from: investor1 });

            const weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(0);

            investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(0);
        });

        it('does NOT allow withdraws when the pool is successful', async () => {
            await felixPool.invest({ from: investor1, value: threshold });

            await increaseTimeTo(latestTime() + duration.days(21));
            await felixPool.finalizePool(token.address);

            try {
                await felixPool.claimRefund({ from: investor1 });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(threshold);

            const investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(threshold);
        });

        it('does NOT allow withdraws when the pool is not finalized', async () => {
            await felixPool.invest({ from: investor1, value: threshold });

            await increaseTimeTo(latestTime() + duration.days(21));

            try {
                await felixPool.claimRefund({ from: investor1 });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(threshold);

            const investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(threshold);
        });

        it('withdraws contributions an investor has made', async () => {
            await felixPool.invest({ from: investor1, value: ether(2) });
            await felixPool.invest({ from: investor2, value: ether(1) });

            let weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(3));

            let investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(ether(2));

            await increaseTimeTo(latestTime() + duration.days(21));
            await felixPool.finalizePool(token.address);

            await felixPool.claimRefund({ from: investor1 });

            weiRaised = await felixPool.weiRaised();
            weiRaised.should.be.bignumber.equal(ether(1));

            investorContributions = await vault.deposited.call(investor1);
            investorContributions.should.be.bignumber.equal(0);

            const investor2Contributions = await vault.deposited.call(
                investor2
            );
            investor2Contributions.should.be.bignumber.equal(ether(1));
        });

        it('resets token entitlements for investors who have withdrawn their investments', async () => {
            await felixPool.invest({ from: investor1, value: ether(2) });
            await felixPool.invest({ from: investor2, value: ether(1) });

            let totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(3).mul(rate));
            let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(
                ether(2).mul(rate)
            );

            await increaseTimeTo(latestTime() + duration.days(21));
            await felixPool.finalizePool(token.address);

            await felixPool.claimRefund({ from: investor1 });

            totalTokens = await felixPool.totalTokens();
            totalTokens.should.be.bignumber.equal(ether(1).mul(rate));
            investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor1
            );
            investorTokenEntitlements.should.be.bignumber.equal(0);

            const investor2TokenEntitlements = await felixPool.tokenEntitlements.call(
                investor2
            );
            investor2TokenEntitlements.should.be.bignumber.equal(
                ether(1).mul(rate)
            );
        });

        it('transfers wei investment back to the investor', async () => {
            const investorWeiBalance = web3.eth.getBalance(investor1);
            await felixPool.invest({ from: investor1, value: ether(5) });

            await increaseTimeTo(latestTime() + duration.days(21));
            await felixPool.finalizePool(token.address);

            await felixPool.claimRefund({ from: investor1 });

            const investorWeiBalancePostInteraction = web3.eth.getBalance(
                investor1
            );

            investorWeiBalancePostInteraction
                .toNumber()
                .should.be.closeTo(investorWeiBalance.toNumber(), 1e17);
        });

        it('emits Refunded event', async () => {
            await felixPool.invest({
                from: investor1,
                value: ether(1)
            });

            await increaseTimeTo(latestTime() + duration.days(21));
            await felixPool.finalizePool(token.address);

            const { logs } = await vault.refund(investor1, {
                from: investor1
            });

            const event = logs.find(e => e.event == 'Refunded');
            expect(event).to.exist;

            const { args } = logs[0];
            const { beneficiary, weiAmount } = args;

            beneficiary.should.be.equal(investor1);
            weiAmount.should.be.bignumber.equal(ether(1));
        });
    });

    describe('#finalizePool', () => {
        let token;
        const totalTokensForPool = threshold.mul(rate);

        beforeEach(async () => {
            token = await TokenMock.new(felixPool.address, totalTokensForPool);
        });

        it('requires admin to set token address', async () => {
            await felixPool.invest({
                from: investor1,
                value: threshold
            });

            await increaseTimeTo(latestTime() + duration.days(21));

            try {
                await felixPool.finalizePool(token.address, {
                    from: investor1
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.false;
        });

        it('requires pool to have finished', async () => {
            await felixPool.invest({
                from: investor1,
                value: threshold
            });

            try {
                await felixPool.finalizePool(token.address, {
                    from: owner
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.false;
        });

        it('requires equal or more tokens sent to pool contract', async () => {
            // eRC20 tokens for tranferred to felixPool is lower than
            // the totalTokens felixPool expects
            await felixPool.invest({
                from: investor1,
                value: threshold.add(ether(1))
            });

            await increaseTimeTo(latestTime() + duration.days(21));
            const test = await felixPool.totalTokens();
            const test2 = await token.balanceOf(felixPool.address);

            try {
                await felixPool.finalizePool(token.address, {
                    from: owner
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.false;
        });

        it('sets ERC20 token to pool', async () => {
            await felixPool.invest({
                from: investor1,
                value: threshold
            });

            await increaseTimeTo(latestTime() + duration.days(21));

            await felixPool.finalizePool(token.address, { from: owner });

            const tokenAddressConfirmed = await felixPool.tokenAddressConfirmed();
            tokenAddressConfirmed.should.be.true;

            const erc20InPool = await felixPool.token();
            erc20InPool.should.be.equal(token.address);
        });

        it('emits TokenConfirmed event', async () => {
            await felixPool.invest({
                from: investor1,
                value: threshold
            });
            await increaseTimeTo(latestTime() + duration.days(21));

            const { logs } = await felixPool.finalizePool(token.address, {
                from: owner
            });

            const event = logs.find(e => e.event == 'TokenConfirmed');
            expect(event).to.exist;

            const { args } = logs[0];
            const { tokenAddress } = args;

            tokenAddress.should.be.equal(token.address);
        });
    });

    describe('#setTokenClaimPercentage', () => {
        it('DOES NOT allow a non-admin to set token claim percentage', async () => {
            try {
                await felixPool.setTokenClaimPercentage(30, {
                    from: investor3
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const percentageOfTokensAllowedToClaim = await felixPool.percentageOfTokensAllowedToClaim();
            // it is the default 100 percent
            percentageOfTokensAllowedToClaim.should.be.bignumber.equal(100);
        });

        it('allows admin to set token claim percentage', async () => {
            await felixPool.setTokenClaimPercentage(30, { from: owner });

            const percentageOfTokensAllowedToClaim = await felixPool.percentageOfTokensAllowedToClaim();
            percentageOfTokensAllowedToClaim.should.be.bignumber.equal(30);
        });
    });

    describe('#claimEntitledTokens', () => {
        let token;
        const totalTokensForPool = threshold.mul(rate);

        beforeEach(async () => {
            token = await TokenMock.new(felixPool.address, totalTokensForPool);

            await felixPool.invest({
                from: investor3,
                value: threshold
            });

            await increaseTimeTo(latestTime() + duration.days(21));
        });

        it('cannot claim when ERC20 tokens are not set', async () => {
            try {
                await felixPool.claimEntitledTokens({
                    from: investor3
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );

            investorTokenEntitlements.should.be.bignumber.equal(
                threshold.mul(rate)
            );

            const investorTokenBalance = await token.balanceOf(investor3);
            investorTokenBalance.should.be.bignumber.equal(0);
        });

        it('cannot claim ERC20 token when investor has not invested in the pool', async () => {
            await felixPool.finalizePool(token.address, { from: owner });

            try {
                await felixPool.claimEntitledTokens({
                    from: investor2
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const investor2TokenEntitlements = await felixPool.tokenEntitlements.call(
                investor2
            );
            investor2TokenEntitlements.should.be.bignumber.equal(0);

            const investor2TokenBalance = await token.balanceOf(investor2);
            investor2TokenBalance.should.be.bignumber.equal(0);
        });

        it('claims ERC20 tokens for investor', async () => {
            await felixPool.finalizePool(token.address, { from: owner });

            await felixPool.claimEntitledTokens({
                from: investor3
            });

            let investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );
            // tokens entitlement is zero because investor has already remmoved them
            investorTokenEntitlements.should.be.bignumber.equal(0);

            let investorTokenBalance = await token.balanceOf(investor3);
            investorTokenBalance.should.be.bignumber.equal(threshold.mul(rate));

            try {
                // can only claim once
                await felixPool.claimEntitledTokens({
                    from: investor3
                });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );
            // tokens entitlement is zero because investor has already remmoved them
            investorTokenEntitlements.should.be.bignumber.equal(0);

            investorTokenBalance = await token.balanceOf(investor3);
            investorTokenBalance.should.be.bignumber.equal(threshold.mul(rate));
        });

        it('claims partial tokens to investor', async () => {
            await felixPool.finalizePool(token.address, { from: owner });

            await felixPool.setTokenClaimPercentage(30);

            const investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );

            await felixPool.claimEntitledTokens({
                from: investor3
            });

            const thirtyPercent = investorTokenEntitlements.mul(30).div(100);

            const postClaimInvestorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );
            postClaimInvestorTokenEntitlements.should.be.bignumber.equal(
                investorTokenEntitlements.sub(thirtyPercent)
            );

            investorTokenBalance = await token.balanceOf(investor3);
            investorTokenBalance.should.be.bignumber.equal(thirtyPercent);
        });

        it('claims partial tokens to investor', async () => {
            await felixPool.finalizePool(token.address, { from: owner });

            await felixPool.setTokenClaimPercentage(60);

            const investorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );

            await felixPool.claimEntitledTokens({
                from: investor3
            });

            const sixtyPercent = investorTokenEntitlements.mul(60).div(100);

            const postClaimInvestorTokenEntitlements = await felixPool.tokenEntitlements.call(
                investor3
            );
            postClaimInvestorTokenEntitlements.should.be.bignumber.equal(
                investorTokenEntitlements.sub(sixtyPercent)
            );

            investorTokenBalance = await token.balanceOf(investor3);
            investorTokenBalance.should.be.bignumber.equal(sixtyPercent);
        });

        it('emits TokensClaimed event', async () => {
            await felixPool.finalizePool(token.address, { from: owner });

            const { logs } = await felixPool.claimEntitledTokens({
                from: investor3
            });

            const event = logs.find(e => e.event == 'TokensClaimed');
            expect(event).to.exist;

            const { args } = logs[0];
            const { investor, claimed } = args;

            investor.should.be.equal(investor3);
            claimed.should.be.bignumber.equal(threshold.mul(rate));
        });
    });
});
