pragma solidity 0.4.23;

import "./Poolbase.sol";
import "./helpers/Ownable.sol";


contract Factory {
    /*
     *  Events
     */
    event ContractInstantiation(address sender, address instantiation, bytes32 hashMessage);

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
    /// @param hashMessage unique identifier for the pool
    function register(address instantiation, bytes32 hashMessage)
        internal
    {
        isInstantiation[instantiation] = true;
        instantiations[msg.sender].push(instantiation);

        emit ContractInstantiation(msg.sender, instantiation, hashMessage);
    }
}


/// @title Poobase factory - Allows creation of pools.
contract PoolbaseFactory is Factory, Ownable {
    address[] public superBouncers;
    address public poolbasePayoutWallet;
    uint256[2] public poolbaseFee;

   /*
    * functions
    */
   /**
     * @dev Add super bouncers. Only two are allowed to exist at any time
     * @param _superBouncers List of super bouncers that belong to poolbase.io
     */
    function setSuperBouncers(address[2] _superBouncers) external onlyOwner {
        require(_superBouncers[0] != address(0) && _superBouncers[1] != address(0));
        superBouncers = _superBouncers;
    }

    function setPoolbasePayoutWallet(address _poolbasePayoutWallet) external onlyOwner {
        require(_poolbasePayoutWallet != address(0));
        poolbasePayoutWallet = _poolbasePayoutWallet;
    }

    function setPoolbaseFee(uint256[2] _poolbaseFee) external onlyOwner {
        require(_poolbaseFee[0] != 0 && _poolbaseFee[1] != 0);
        poolbaseFee = _poolbaseFee;
    }

    function getSuperBouncers() external view returns(address, address) {
        return (superBouncers[0], superBouncers[1]);
    }

    function getPoolbasePayoutWallet() external view returns(address) {
        return poolbasePayoutWallet;
    }

    function getPoolbaseFee() external view returns(uint256, uint256) {
        return (poolbaseFee[0], poolbaseFee[1]);
    }

    /* @dev Allows verified creation of pools.
    * @param _maxAllocation Pool cap in wei
    * @param _adminPoolFee Percentage from the pool that goes to master admin pool
    * @param _isAdminFeeInWei Check on whether master admin pool fee is paid out in Ether.
    * @param _payoutwallet Address where funds collected will be sent to at the end
    * @param _adminPayoutWallet Address where admin fees goes to
    * @param _eventEmitterContract Address of event emitter contract
    * If not then it is paid out in ERC20 tokens
    * @param _admins List of pool admin addresses.
    */
    function create
    (
        uint256 _maxAllocation,
        uint256[2] _adminPoolFee,
        bool _isAdminFeeInWei,
        address _payoutWallet,
        address _adminPayoutWallet,
        address _eventEmitterContract,
        address[] _admins
    )
        public
        returns (address pool)
    {
        pool = new Poolbase(
            superBouncers,
            _maxAllocation,
            _adminPoolFee,
            poolbaseFee,
            _isAdminFeeInWei,
            _payoutWallet,
            _adminPayoutWallet,
            poolbasePayoutWallet,
            _eventEmitterContract,
            _admins
        );

        bytes32 hashMessage = keccak256(abi.encodePacked(
          _maxAllocation,
          _adminPoolFee,
          _isAdminFeeInWei,
          _payoutWallet,
          _adminPayoutWallet,
          _admins
        ));

        register(pool, hashMessage);
    }
}
