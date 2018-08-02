pragma solidity 0.4.24;


contract PoolbaseEventEmitter {
    event ContributionMade(address poolContractAddress, address msgSender, uint256 contribution);
    event Closed(address poolContractAddress, address msgSender);
    event RefundsEnabled(address poolContractAddress, address msgSender);
    event TokenPayoutsEnabled(address poolContractAddress, address msgSender);
    event Pause(address poolContractAddress, address msgSender);
    event Unpause(address poolContractAddress, address msgSender);
    event Refunded(address poolContractAddress, address indexed msgSender, uint256 weiAmount);
    event TokenClaimed(address poolContractAddress, address indexed msgSender, uint256 amount, address token);

    function logContributionEvent
    (
        address poolContractAddress,
        address _msgSender,
        uint256 _contribution
    )
        public
    {
        emit ContributionMade(poolContractAddress, _msgSender, _contribution);
    }

    function logClosedEvent(address poolContractAddress, address msgSender) public {
        emit Closed(poolContractAddress, msgSender);
    }

    function logRefundsEnabledEvent(address poolContractAddress, address msgSender) public {
        emit RefundsEnabled(poolContractAddress, msgSender);
    }

    function logTokenPayoutEnabledEvent(address poolContractAddress, address msgSender) public {
        emit TokenPayoutsEnabled(poolContractAddress, msgSender);
    }

    function logPausedEvent(address poolContractAddress, address msgSender) public {
        emit Pause(poolContractAddress, msgSender);
    }

    function logUnpausedEvent(address poolContractAddress, address msgSender) public {
        emit Unpause(poolContractAddress, msgSender);
    }

    function logRefundedEvent(address poolContractAddress, address _msgSender, uint256 _weiAmount) public {
        emit Refunded(poolContractAddress, _msgSender, _weiAmount);
    }

    function logTokenClaimedEvent(address poolContractAddress, address _msgSender, uint256 _amount, address _token) public {
        emit TokenClaimed(poolContractAddress, _msgSender, _amount, _token);
    }
}
