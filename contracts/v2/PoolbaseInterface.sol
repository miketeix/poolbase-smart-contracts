pragma solidity 0.4.24;


/**
 * @title Poolbase contract interface
 */
contract PoolbaseInterface {
    function init
    (
        address[2] _bouncers,
        uint256 _maxAllocation,
        uint256[2] _adminPoolFee,
        uint256[2] _poolbaseFee,
        bool _isAdminFeeInWei,
        address _payoutWallet,
        address _adminPayoutWallet,
        address _poolbasePayoutWallet,
        address _eventEmitterContract,
        address[] _admins
    )
    external;

    function addBouncer(address _bouncer) public;
    function removeBouncer(address _bouncer) public;
}
