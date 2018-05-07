const FelixPool = artifacts.require('./FelixPool.sol');
const BigNumber = web3.BigNumber;

const { latestTime, duration, increaseTimeTo } = require('./helpers/timer');
const { should, ensuresException } = require('./helpers/utils');

contract('FelixPool', ([owner, investor, investor2, investor3]) => {
    let felixPool;

    const threshold = new BigNumber(100);
    const endTime = latestTime() + duration.days(20); // 20 days
    const rate = new BigNumber(10);

    beforeEach(async () => {
        felixPool = await FelixPool.new(threshold, endTime, rate);
    });

    describe('constructor sets variables', () => {
        it('sets the pool threshold', async () => {
            const thresholdInContract = await felixPool.threshold();
            thresholdInContract.should.be.bignumber.equal(threshold);
        });

        it('sets endTime', async () => {
            const endTimeInContract = await felixPool.endTime();
            endTimeInContract.should.be.bignumber.equal(endTime);
        });

        it('sets rate', async () => {
            const rateInContract = await felixPool.rate();
            rateInContract.should.be.bignumber.equal(rate);
        });
    });

    describe.only('#deposit', () => {
        /*
         * @dev Allows contributors to invest in the pool
         */
        // function deposit() public payable {
        //     require(now <= endTime);
        //     uint value = msg.value;
        //     uint tokensToReceive = value.mul(rate);
        //
        //     contributions[msg.sender] = contributions[msg.sender].add(value);
        //     tokenEntitlement[msg.sender] = tokenEntitlement[msg.sender].add(tokensToReceive);
        //     totalTokens = totalTokens.add(tokensToReceive);
        //     totalContributions = totalContributions.add(value);
        //     emit ContributionMade(msg.sender, value);
        // }
        it('does NOT allow investments after the pool finishes', async () => {
            await increaseTimeTo(latestTime() + duration.days(21));

            try {
                await felixPool.deposit({ from: investor });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const totalContributions = await felixPool.totalContributions();
            totalContributions.should.be.bignumber.equal(0);
        });

        // it('cannot update with an empty params', async () => {
        //     try {
        //         await registry.updateMerchant(merchant, '');
        //         assert.fail();
        //     } catch (e) {
        //         ensuresException(e);
        //     }
        //
        //     try {
        //         await registry.updateMerchant(
        //             '0x00',
        //             '0x6e6577207061737361706f727444617461000000000000000000000000000000'
        //         );
        //         assert.fail();
        //     } catch (e) {
        //         ensuresException(e);
        //     }
        //
        //     await registry.updateMerchant(
        //         merchant,
        //         '0x6e6577207061737361706f727444617461000000000000000000000000000000'
        //     );
        //
        //     const firstMerchant = await registry.store.call(merchant);
        //     firstMerchant[0].should.be.true;
        //     firstMerchant[1].should.be.equal(
        //         '0x6e6577207061737361706f727444617461000000000000000000000000000000'
        //     );
        // });
        //
        // it('only owner updates citizes', async () => {
        //     try {
        //         await registry.updateMerchant(
        //             merchant,
        //             '0x6e6577206e6577206e6577000000000000000000000000000000000000000000',
        //             {
        //                 from: merchant
        //             }
        //         );
        //         assert.fail();
        //     } catch (e) {
        //         ensuresException(e);
        //     }
        //
        //     await registry.updateMerchant(
        //         merchant,
        //         '0x6e6577206e6577206e6577000000000000000000000000000000000000000000',
        //         {
        //             from: owner
        //         }
        //     );
        //
        //     const firstMerchant = await registry.store.call(merchant);
        //     firstMerchant[0].should.be.true;
        //     firstMerchant[1].should.be.equal(
        //         '0x6e6577206e6577206e6577000000000000000000000000000000000000000000'
        //     );
        // });
    });

    describe('removeMerchant', () => {
        it('needs to be a merchant to be removed', async () => {
            try {
                await registry.removeMerchant(merchant);
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }
        });

        it('allows only owner to remove merchant', async () => {
            await registry.addMerchant(
                merchant,
                '0x7061737361706f72744461746100000000000000000000000000000000000000'
            );

            try {
                await registry.removeMerchant(merchant, { from: merchant2 });
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const firstMerchant = await registry.store.call(merchant);
            firstMerchant[0].should.be.true; // still a merchant
        });

        it('cannot remove an empty address', async () => {
            await registry.addMerchant(
                merchant,
                '0x7061737361706f72744461746100000000000000000000000000000000000000'
            );

            try {
                await registry.removeMerchant('0x000');
                assert.fail();
            } catch (e) {
                ensuresException(e);
            }

            const firstMerchant = await registry.store.call(merchant);
            firstMerchant[0].should.be.true; // still a merchant
            firstMerchant[1].should.be.equal(
                '0x7061737361706f72744461746100000000000000000000000000000000000000'
            );
        });

        it('removes merchant', async () => {
            await registry.addMerchant(
                merchant,
                '0x7061737361706f72744461746100000000000000000000000000000000000000'
            );

            await registry.removeMerchant(merchant, { from: owner });

            const firstMerchant = await registry.store.call(merchant);
            firstMerchant[0].should.be.false; // no more a merchant
        });
    });
});
