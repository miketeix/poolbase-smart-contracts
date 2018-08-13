pragma solidity 0.4.24;


/**
 * @title Poolbase contract interface
 */
interface PoolbaseInterface {
    function init
    (
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
}
