pragma solidity 0.4.23;


contract PoolbaseEventEmitter {
    event ContributionMade(address contractAddress, address investor, address pool, uint256 contribution);
    event Closed(address contractAddress);
    event RefundsEnabled(address contractAddress);
    event TokenPayoutsEnabled(address contractAddress);
    event Pause(address contractAddress);
    event Unpause(address contractAddress);
    event Refunded(address contractAddress, address indexed beneficiary, uint256 weiAmount);
    event TokenClaimed(address contractAddress, address indexed beneficiary, uint256 amount, address token);

    function logContributionEvent
    (
        address contractAddress,
        address _investor,
        address _pool,
        uint256 _contribution
    )
        public
    {
        emit ContributionMade(contractAddress, _investor, _pool, _contribution);
    }

    function logClosedEvent(address contractAddress) public {
        emit Closed(contractAddress);
    }

    function logRefundsEnabledEvent(address contractAddress) public {
        emit RefundsEnabled(contractAddress);
    }

    function logTokenPayoutEnabledEvent(address contractAddress) public {
        emit TokenPayoutsEnabled(contractAddress);
    }

    function logPausedEvent(address contractAddress) public {
        emit Pause(contractAddress);
    }

    function logUnpausedEvent(address contractAddress) public {
        emit Unpause(contractAddress);
    }

    function logRefundedEvent(address contractAddress, address _beneficiary, uint256 _weiAmount) public {
        emit Refunded(contractAddress, _beneficiary, _weiAmount);
    }

    function logTokenClaimedEvent(address contractAddress, address _beneficiary, uint256 _amount, address _token) public {
        emit TokenClaimed(contractAddress, _beneficiary, _amount, _token);
    }
}
