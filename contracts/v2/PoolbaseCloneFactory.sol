pragma solidity 0.4.24;

import "./PoolbaseInterface.sol";
import "./CloneFactory.sol";
import "../lib/Ownable.sol";


contract PoolbaseCloneFactory is Ownable, CloneFactory {
    // poolbase contract address for cloning purposes
    address public libraryAddress;
    address[2] public superBouncers;
    address public poolbasePayoutWallet;
    uint256[2] public poolbaseFee;

    mapping(address => bool) public isInstantiation;
    mapping(address => address[]) public instantiations;

    event ContractInstantiation(address msgSender, address instantiation, bytes32 hashMessage);

    // set poolbase contract clone on deployment
    // i.e. upon Poolbase deployment
    constructor(address _libraryAddress) public {
        require(_libraryAddress != address(0), "_libraryAddress cannot be empty");
        libraryAddress = _libraryAddress;
    }

   /**
    * @dev Have the option of updating the poolbase contract for cloning purposes
    * @param _libraryAddress Address for new contract
    */
    function setLibraryAddress(address _libraryAddress) external onlyOwner {
        require(_libraryAddress != address(0), "_libraryAddress cannot be empty");
        libraryAddress = _libraryAddress;
    }

    /**
     * @dev Add super bouncers to factory.
     * Only two are allowed to exist at any time. These will be added to a pool by default every time a new pool is created
     * @param _superBouncers List of super bouncers that belong to poolbase.io
     */
    function setSuperBouncers(address[] _superBouncers) external onlyOwner {
        require(_superBouncers[0] != address(0) && _superBouncers[1] != address(0), "_superBouncers addresses cannot be empty");
        superBouncers[0] = _superBouncers[0];
        superBouncers[1] = _superBouncers[1];
    }

    /**
     * @dev Add super bouncers to a poolbase contract
     * @param _superBouncer Super bouncer that belong to poolbase.io
     */
    function addBouncersToAPool(address _superBouncer, address poolAddress) external onlyOwner {
        require(_superBouncer != address(0), "_superBouncer addresse cannot be empty");
        PoolbaseInterface(poolAddress).addBouncer(_superBouncer);
    }

    /**
     * @dev Remove super bouncers to a poolbase contract
     * @param _superBouncer Super bouncer that belong to poolbase.io
     */
    function removeBouncersToAPool(address _superBouncer, address poolAddress) external onlyOwner {
        require(_superBouncer != address(0), "_superBouncer address cannot be empty");
        PoolbaseInterface(poolAddress).removeBouncer(_superBouncer);
    }

    /**
     * @dev Add poolbase payout wallet. Only two are allowed to exist at any time
     * @param _poolbasePayoutWallet Address of wallet that belongs to Poolbase
     */
    function setPoolbasePayoutWallet(address _poolbasePayoutWallet) external onlyOwner {
        require(_poolbasePayoutWallet != address(0), "_poolbasePayoutWallet address cannot be empty");
        poolbasePayoutWallet = _poolbasePayoutWallet;
    }

    /**
     * @dev Sets Poolbase fee. only called by Poolbase factory owner
     * @param _poolbaseFee List with two elements referencing poolbase fee as a fraction
     * e.g. 1/2 is [1,2]
     */
    function setPoolbaseFee(uint256[2] _poolbaseFee) external onlyOwner {
        require(_poolbaseFee[0] != 0 && _poolbaseFee[1] != 0, "_poolbaseFee numbers cannot be zero");
        poolbaseFee = _poolbaseFee;
    }

    /**
     * @dev Function getter for superBouncers
     */
    function getSuperBouncers() external view returns(address, address) {
        return (superBouncers[0], superBouncers[1]);
    }

    /**
     * @dev Getter for poolbase payout wallet
     */
    function getPoolbasePayoutWallet() external view returns(address) {
        return poolbasePayoutWallet;
    }

    /**
     * @dev Getter for poolbase fee
     */
    function getPoolbaseFee() external view returns(uint256, uint256) {
        return (poolbaseFee[0], poolbaseFee[1]);
    }

    /**
     * @dev Returns number of instantiations by creator.
     * @param creator Contract creator.
     * @return Returns number of instantiations by creator.
     */
    function getInstantiationCount(address creator)
        public
        view
        returns (uint256)
    {
        return instantiations[creator].length;
    }

    /**
     * @dev Allows verified creation of pools.
     * @param _maxAllocation Pool cap in wei
     * @param _adminPoolFee Percentage from the pool that goes to master admin pool
     * @param _isAdminFeeInWei Check on whether master admin pool fee is paid out in Ether.
     * @param _payoutWallet Address where funds collected will be sent to at the end
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
    {
        address pool = createClone(libraryAddress);
        PoolbaseInterface(pool).init(
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

    /**
     * @dev Registers contract in factory registry.
     * @param instantiation Address of contract instantiation.
     * @param hashMessage unique identifier for the pool
     */
    function register(address instantiation, bytes32 hashMessage)
        internal
    {
        isInstantiation[instantiation] = true;
        instantiations[msg.sender].push(instantiation);

        emit ContractInstantiation(msg.sender, instantiation, hashMessage);
    }
}
