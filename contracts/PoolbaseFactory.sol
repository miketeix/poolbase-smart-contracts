pragma solidity 0.4.23;

import "./Poolbase.sol";

contract Factory {

    /*
     *  Events
     */
    event ContractInstantiation(address sender, address instantiation);

    /*
     *  Storage
     */
    mapping(address => bool) public isInstantiation;
    mapping(address => address[]) public instantiations;

    /*
     * Public functions
     */
    /// @dev Returns number of instantiations by creator.
    /// @param creator Contract creator.
    /// @return Returns number of instantiations by creator.
    function getInstantiationCount(address creator)
        public
        constant
        returns (uint256)
    {
        return instantiations[creator].length;
    }

    /*
     * Internal functions
     */
    /// @dev Registers contract in factory registry.
    /// @param instantiation Address of contract instantiation.
    function register(address instantiation)
        internal
    {
        isInstantiation[instantiation] = true;
        instantiations[msg.sender].push(instantiation);
        emit ContractInstantiation(msg.sender, instantiation);
    }
}


/// @title Poobase factory - Allows creation of pools.
contract PoolbaseFactory is Factory {

    /*
     * Public functions
     */

    /* @dev Allows verified creation of pools.
     * @param _superAdmins List of super admin addresses. They belong to Poolbase.io
     * @param _maxAllocation Pool cap in wei
     * @param _minContributionPerInvestor Minimum amount each investor is allowed
     * @param _maxContributionPerInvestor Maximum amount each investor is allowed
     * @param _adminPoolFee Percentage from the pool that goes to master admin pool
     * @param _eventEmitterContract Address of event emitter contract
     * @param _isAdminFeeInWei Check on whether master admin pool fee is paid out in Ether.
     * If not then it is paid out in ERC20 tokens
     * @param _admins List of pool admin addresses.
     * @return Returns pool address.
     */
    function create
    (
        address[] _superAdmins,
        uint256 _maxAllocation,
        uint256 _minContributionPerInvestor,
        uint256 _maxContributionPerInvestor,
        uint256 _adminPoolFee,
        bool _isAdminFeeInWei,
        address _eventEmitterContract,
        address[] _admins
    )
        public
        returns (address pool)
    {
        pool = new Poolbase(
            _superAdmins,
            _maxAllocation,
            _minContributionPerInvestor,
            _maxContributionPerInvestor,
            _adminPoolFee,
            _isAdminFeeInWei,
            _eventEmitterContract,
            _admins
        );
        register(pool);
    }
}
