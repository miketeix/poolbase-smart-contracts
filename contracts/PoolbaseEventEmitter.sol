pragma solidity 0.4.23;


contract PoolbaseEventEmitter {
    event ContributionMade(address poolContractAddress, address investor, uint256 contribution);
    event Closed(address poolContractAddress);
    event RefundsEnabled(address poolContractAddress);
    event TokenPayoutsEnabled(address poolContractAddress);
    event Pause(address poolContractAddress);
    event Unpause(address poolContractAddress);
    event Refunded(address poolContractAddress, address indexed beneficiary, uint256 weiAmount);
    event TokenClaimed(address poolContractAddress, address indexed beneficiary, uint256 amount, address token);

    function logContributionEvent
    (
        address poolContractAddress,
        address _investor,
        uint256 _contribution
    )
        public
    {
        emit ContributionMade(poolContractAddress, _investor, _contribution);
    }

    function logClosedEvent(address poolContractAddress) public {
        emit Closed(poolContractAddress);
    }

    function logRefundsEnabledEvent(address poolContractAddress) public {
        emit RefundsEnabled(poolContractAddress);
    }

    function logTokenPayoutEnabledEvent(address poolContractAddress) public {
        emit TokenPayoutsEnabled(poolContractAddress);
    }

    function logPausedEvent(address poolContractAddress) public {
        emit Pause(poolContractAddress);
    }

    function logUnpausedEvent(address poolContractAddress) public {
        emit Unpause(poolContractAddress);
    }

    function logRefundedEvent(address poolContractAddress, address _beneficiary, uint256 _weiAmount) public {
        emit Refunded(poolContractAddress, _beneficiary, _weiAmount);
    }

    function logTokenClaimedEvent(address poolContractAddress, address _beneficiary, uint256 _amount, address _token) public {
        emit TokenClaimed(poolContractAddress, _beneficiary, _amount, _token);
    }
}
