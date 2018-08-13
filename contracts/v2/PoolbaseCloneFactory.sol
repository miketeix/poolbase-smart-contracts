pragma solidity 0.4.24;

import "./PoolbaseInterface.sol";
import "../clone/CloneFactory.sol";
import "../helpers/Ownable.sol";
import "../helpers/SafeMath.sol";


contract PoolbaseCloneFactory is Ownable, CloneFactory {
    using SafeMath for uint256;
    // poolbase contract address for cloning purposes
    address public libraryAddress;
    address public poolbasePayoutWallet;
    uint256[2] public poolbaseFee;

    mapping(address => bool) public isInstantiation;
    mapping(address => address[]) public instantiations;

    event ContractInstantiation(address msgSender, address instantiation, bytes32 hashMessage);

    // set poolbase contract clone on deployment
    // NOTE: superBouncers, addresses that belonng to Poolbase, must be set in the library/ poolbase clone level
    // i.e. upon Poolbase deployment
    constructor(address _libraryAddress) public {
        libraryAddress = _libraryAddress;
    }

   /**
    * @dev Have the option of updating the poolbase contract for cloning
    * @param _libraryAddress Address for new contract. Note that superBouncers will be set
    * in the _libraryAddress deployment
    */
    function setLibraryAddress(address _libraryAddress) external onlyOwner {
        libraryAddress = _libraryAddress;
    }

    /**
     * @dev Add poolbase payout wallet. Only two are allowed to exist at any time
     * @param _poolbasePayoutWallet Address of wallet that belongs to Poolbase
     */
    function setPoolbasePayoutWallet(address _poolbasePayoutWallet) external onlyOwner {
        require(_poolbasePayoutWallet != address(0));
        poolbasePayoutWallet = _poolbasePayoutWallet;
    }

    /**
     * @dev Sets Poolbase fee. only called by Poolbase factory owner
     * @param _poolbaseFee List with two elements referencing poolbase fee as a fraction
     * e.g. 1/2 is [1,2]
     */
    function setPoolbaseFee(uint256[2] _poolbaseFee) external onlyOwner {
        require(_poolbaseFee[0] != 0 && _poolbaseFee[1] != 0);
        poolbaseFee = _poolbaseFee;
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
