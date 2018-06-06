pragma solidity 0.4.23;


contract PoolbaseEventEmitter {
    event ContributionMade(address investor, address pool, uint256 contribution);

    function logContributionEvent(address _investor, address _pool, uint256 _contribution) internal {
        emit ContributionMade(_investor, _pool, _contribution);
    }
}
