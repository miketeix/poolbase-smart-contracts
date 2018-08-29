pragma solidity 0.4.24;

// File: contracts/PoolbaseEventEmitter.sol

contract PoolbaseEventEmitter {
    event ContributionMade(address poolContractAddress, address msgSender, uint256 contribution);
    event Closed(address poolContractAddress, address msgSender);
    event RefundsEnabled(address poolContractAddress, address msgSender);
    event TokenPayoutsEnabled(address poolContractAddress, address msgSender);
    event Pause(address poolContractAddress, address msgSender);
    event Unpause(address poolContractAddress, address msgSender);
    event Refunded(address poolContractAddress, address indexed msgSender, uint256 weiAmount);
    event TokenClaimed(address poolContractAddress, address indexed msgSender, uint256 amount, address token);
    event AdminPayoutWalletSet(address poolContractAddress, address indexed msgSender, address adminPayoutWallet);
    event AdminPoolFeeSet(address poolContractAddress, address indexed msgSender, uint256[2] adminPoolFee );
    event MaxAllocationChanged(address poolContractAddress, address indexed msgSender, uint256 maxAllocation);

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

    function logSetAdminPayoutWalletEvent(address poolContractAddress, address _msgSender, address _adminPayoutWallet) public {
        emit AdminPayoutWalletSet(poolContractAddress, _msgSender, _adminPayoutWallet);
    }

    function logSetAdminPoolFeeEvent(address poolContractAddress, address _msgSender, uint256[2] _adminPoolFee) public {
        emit AdminPoolFeeSet(poolContractAddress, _msgSender, _adminPoolFee);
    }

    function logChangeMaxAllocationEvent(address poolContractAddress, address _msgSender, uint256 maxAllocation) public {
        emit MaxAllocationChanged(poolContractAddress, _msgSender, maxAllocation);
    }
}

// File: contracts/lib/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    if (a == 0) {
      return 0;
    }
    c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return a / b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    assert(c >= a);
    return c;
  }
}

// File: contracts/lib/Roles.sol

/**
 * @title Roles
 * @author Francisco Giordano (@frangio)
 * @dev Library for managing addresses assigned to a Role.
 *      See RBAC.sol for example usage.
 */
library Roles {
  struct Role {
    mapping (address => bool) bearer;
  }

  /**
   * @dev give an address access to this role
   */
  function add(Role storage role, address addr)
    internal
  {
    role.bearer[addr] = true;
  }

  /**
   * @dev remove an address' access to this role
   */
  function remove(Role storage role, address addr)
    internal
  {
    role.bearer[addr] = false;
  }

  /**
   * @dev check if an address has this role
   * // reverts
   */
  function check(Role storage role, address addr)
    view
    internal
  {
    require(has(role, addr), "Needs to have the correct role to call this function");
  }

  /**
   * @dev check if an address has this role
   * @return bool
   */
  function has(Role storage role, address addr)
    view
    internal
    returns (bool)
  {
    return role.bearer[addr];
  }
}

// File: contracts/lib/RBAC.sol

/**
 * @title RBAC (Role-Based Access Control)
 * @author Matt Condon (@Shrugs)
 * @dev Stores and provides setters and getters for roles and addresses.
 * @dev Supports unlimited numbers of roles and addresses.
 * @dev See //contracts/mocks/RBACMock.sol for an example of usage.
 * This RBAC method uses strings to key roles. It may be beneficial
 *  for you to write your own implementation of this interface using Enums or similar.
 * It's also recommended that you define constants in the contract, like ROLE_ADMIN below,
 *  to avoid typos.
 */
contract RBAC {
    using Roles for Roles.Role;

    mapping (string => Roles.Role) private roles;

    event RoleAdded(address addr, string roleName);
    event RoleRemoved(address addr, string roleName);

    /**
     * @dev reverts if addr does not have role
     * @param addr address
     * @param roleName the name of the role
     * // reverts
     */
    function checkRole(address addr, string roleName)
        public
        view
    {
        roles[roleName].check(addr);
    }

    /**
     * @dev determine if addr has role
     * @param addr address
     * @param roleName the name of the role
     * @return bool
     */
    function hasRole(address addr, string roleName)
        public
        view
        returns (bool)
    {
        return roles[roleName].has(addr);
    }

    /**
     * @dev add a role to an address
     * @param addr address
     * @param roleName the name of the role
    */
    function addRole(address addr, string roleName)
        internal
    {
        roles[roleName].add(addr);
        emit RoleAdded(addr, roleName);
    }

    /**
     * @dev remove a role from an address
     * @param addr address
     * @param roleName the name of the role
     */
    function removeRole(address addr, string roleName)
        internal
    {
        roles[roleName].remove(addr);
        emit RoleRemoved(addr, roleName);
    }

    /**
    * @dev modifier to scope access to a single role (uses msg.sender as addr)
    * @param roleName the name of the role
    * // reverts
    */
    modifier onlyRole(string roleName) {
        checkRole(msg.sender, roleName);
        _;
    }

    /**
    * @dev modifier to scope access to a set of roles (uses msg.sender as addr)
    * @param roleNames the names of the roles to scope access to
    * // reverts
    *
    * @TODO - when solidity supports dynamic arrays as arguments to modifiers, provide this
    *  see: https://github.com/ethereum/solidity/issues/2467
    */
    // modifier onlyRoles(string[] roleNames) {
    //     bool hasAnyRole = false;
    //     for (uint8 i = 0; i < roleNames.length; i++) {
    //         if (hasRole(msg.sender, roleNames[i])) {
    //             hasAnyRole = true;
    //             break;
    //         }
    //     }

    //     require(hasAnyRole);

    //     _;
    // }
}

// File: contracts/lib/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;

  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "only contract owner is able to call this function");
    _;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   * @notice Renouncing to ownership will leave the contract without an owner.
   * It will not be possible to call the functions with the `onlyOwner`
   * modifier anymore.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0), "_newOwner cannot be an empty address");
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}

// File: contracts/lib/ECRecovery.sol

/**
 * @title Eliptic curve signature operations
 *
 * @dev Based on https://gist.github.com/axic/5b33912c6f61ae6fd96d6c4a47afde6d
 *
 * TODO Remove this library once solidity supports passing a signature to ecrecover.
 * See https://github.com/ethereum/solidity/issues/864
 *
 */

library ECRecovery {

  /**
   * @dev Recover signer address from a message by using their signature
   * @param hash bytes32 message, the hash is the signed message. What is recovered is the signer address.
   * @param sig bytes signature, the signature is generated using web3.eth.sign()
   */
  function recover(bytes32 hash, bytes sig)
    internal
    pure
    returns (address)
  {
    bytes32 r;
    bytes32 s;
    uint8 v;

    // Check the signature length
    if (sig.length != 65) {
      return (address(0));
    }

    // Divide the signature in r, s and v variables
    // ecrecover takes the signature parameters, and the only way to get them
    // currently is to use assembly.
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := byte(0, mload(add(sig, 96)))
    }

    // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
    if (v < 27) {
      v += 27;
    }

    // If the version is correct return the signer address
    if (v != 27 && v != 28) {
      return (address(0));
    } else {
      // solium-disable-next-line arg-overflow
      return ecrecover(hash, v, r, s);
    }
  }

  /**
   * toEthSignedMessageHash
   * @dev prefix a bytes32 value with "\x19Ethereum Signed Message:"
   * @dev and hash the result
   */
  function toEthSignedMessageHash(bytes32 hash)
    internal
    pure
    returns (bytes32)
  {
    // 32 is the length in bytes of hash,
    // enforced by the type signature above
    return keccak256(
        abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            hash
        )
    );
  }
}

// File: contracts/lib/SignatureBouncer.sol

// UPDATED VERSION FROM OPEN ZEPPELIN
pragma solidity 0.4.24;



/**
 * @title SignatureBouncer
 * @author PhABC, Shrugs and aflesher
 * @dev Bouncer allows users to submit a signature as a permission to do an action.
 * If the signature is from one of the authorized bouncer addresses, the signature
 * is valid. The owner of the contract adds/removes bouncers.
 * Bouncer addresses can be individual servers signing grants or different
 * users within a decentralized club that have permission to invite other members.
 * This technique is useful for whitelists and airdrops; instead of putting all
 * valid addresses on-chain, simply sign a grant of the form
 * keccak256(abi.encodePacked(`:contractAddress` + `:granteeAddress`)) using a valid bouncer address.
 * Then restrict access to your crowdsale/whitelist/airdrop using the
 * `onlyValidSignature` modifier (or implement your own using isValidSignature).
 * In addition to `onlyValidSignature`, `onlyValidSignatureAndMethod` and
 * `onlyValidSignatureAndData` can be used to restrict access to only a given method
 * or a given method with given parameters respectively.
 * See the tests Bouncer.test.js for specific usage examples.
 * @notice A method that uses the `onlyValidSignatureAndData` modifier must make the _sig
 * parameter the "last" parameter. You cannot sign a message that has its own
 * signature in it so the last 128 bytes of msg.data (which represents the
 * length of the _sig data and the _sig data itself) is ignored when validating.
 * Also non fixed sized parameters make constructing the data in the signature
 * much more complex. See https://ethereum.stackexchange.com/a/50616 for more details.
 */


contract SignatureBouncer is Ownable, RBAC {
  using ECRecovery for bytes32;

  string public constant ROLE_BOUNCER = "bouncer";
  uint constant METHOD_ID_SIZE = 4;
  // (signature length size) 32 bytes + (signature size 65 bytes padded) 96 bytes
  uint constant SIGNATURE_SIZE = 128;

  /**
   * @dev requires that a valid signature of a bouncer was provided
   */
  modifier onlyValidSignature(bytes _sig)
  {
    require(isValidSignature(msg.sender, _sig));
    _;
  }

  /**
   * @dev requires that a valid signature with a specifed method of a bouncer was provided
   */
  modifier onlyValidSignatureAndMethod(bytes _sig)
  {
    require(isValidSignatureAndMethod(msg.sender, _sig));
    _;
  }

  /**
   * @dev requires that a valid signature with a specifed method and params of a bouncer was provided
   */
  modifier onlyValidSignatureAndData(bytes _sig)
  {
    require(isValidSignatureAndData(msg.sender, _sig));
    _;
  }

  /**
   * @dev requires contract owner or another bouncer
   */
  modifier onlyOwnerOrBouncer()
  {
    bool isBouncer = hasRole(msg.sender, ROLE_BOUNCER);
    require(msg.sender == owner || isBouncer, "allows owner or another bouncer to call function");
    _;
  }

  /**
   * @dev allows the owner or bouncer to add additional bouncer addresses
   */
  function addBouncer(address _bouncer)
    onlyOwnerOrBouncer
    public
  {
    require(_bouncer != address(0), "_bouncer address cannot be empty");
    addRole(_bouncer, ROLE_BOUNCER);
  }

  /**
   * @dev allows the owner or bouncer to remove bouncer addresses
   */
  function removeBouncer(address _bouncer)
    onlyOwnerOrBouncer
    public
  {
    require(_bouncer != address(0), "_bouncer address cannot be empty");
    removeRole(_bouncer, ROLE_BOUNCER);
  }

  /**
   * @dev is the signature of `this + sender` from a bouncer?
   * @return bool
   */
  function isValidSignature(address _address, bytes _sig)
    internal
    view
    returns (bool)
  {
    return isValidDataHash(
      keccak256(abi.encodePacked(address(this), _address)),
      _sig
    );
  }

  /**
   * @dev is the signature of `this + sender + methodId` from a bouncer?
   * @return bool
   */
  function isValidSignatureAndMethod(address _address, bytes _sig)
    internal
    view
    returns (bool)
  {
    bytes memory data = new bytes(METHOD_ID_SIZE);
    for (uint i = 0; i < data.length; i++) {
      data[i] = msg.data[i];
    }
    return isValidDataHash(
      keccak256(abi.encodePacked(address(this), _address, data)),
      _sig
    );
  }

  /**
    * @dev is the signature of `this + sender + methodId + params(s)` from a bouncer?
    * @notice the _sig parameter of the method being validated must be the "last" parameter
    * @return bool
    */
  function isValidSignatureAndData(address _address, bytes _sig)
    internal
    view
    returns (bool)
  {
    require(msg.data.length > SIGNATURE_SIZE);
    bytes memory data = new bytes(msg.data.length - SIGNATURE_SIZE);
    for (uint i = 0; i < data.length; i++) {
      data[i] = msg.data[i];
    }
    return isValidDataHash(
      keccak256(abi.encodePacked(address(this), _address, data)),
      _sig
    );
  }

  /**
   * @dev internal function to convert a hash to an eth signed message
   * and then recover the signature and check it against the bouncer role
   * @return bool
   */
  function isValidDataHash(bytes32 hash, bytes _sig)
    internal
    view
    returns (bool)
  {
    address signer = hash
      .toEthSignedMessageHash()
      .recover(_sig);
    return hasRole(signer, ROLE_BOUNCER);
  }
}

// File: contracts/lib/ERC20.sol

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 {
    function allowance(address owner, address spender) public view returns (uint256);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    function totalSupply() public view returns (uint256);
    function balanceOf(address who) public view returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
}

// File: contracts/v2/PoolbaseInterface.sol

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

// File: contracts/v2/Poolbase.sol

contract Poolbase is SignatureBouncer {
    using SafeMath for uint256;
    // global variables
    string public constant ROLE_ADMIN = "admin";

    uint256 public maxAllocation;
    uint256 public totalWeiRaised;
    uint256[2] public adminPoolFee;
    uint256[2] public poolbaseFee;
    bool public isAdminFeeInWei;
    address public payoutWallet;
    address public adminPayoutWallet;
    address public poolbasePayoutWallet;

    bool public poolbaseVouched;
    bool public adminVouched;
    bool public acceptAllPayments;
    bool public paused;
    ERC20 public token;

    /* State vars */
    enum State { Active, Refunding, Closed, TokenPayout }
    State public state;

    uint256 public totalTokens;

    uint256 public allTokensClaimedByInvestors;

    mapping (address => uint256) public deposited;
    mapping (address => uint256) public tokenClaimed;

    /* External Contract */
    PoolbaseEventEmitter public eventEmitter;

    /*
     *  Pausing Mechanism
    */
    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!paused, "Contract functions must be unpaused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        require(paused, "Contract functions must be paused");
        _;
    }

    /**
     * @dev fallback function with flag to accept ether at given moment or not
     * this will be used if crowdsale returns ether back to contract for refund purposes, etc.
     */
    function () external payable {
        require(acceptAllPayments, "Only accept payments in the fallback function when acceptAllPayments flag is set");
    }

    /**
     * @dev init function to initialize a contract
     * @param _bouncers List of poolbase bouncers
     * @param _maxAllocation Pool cap in wei
     * @param _adminPoolFee Percentage from the pool that goes to master admin pool
     * @param _poolbaseFee Percentage from the pool that goes to Poolbase
     * @param _isAdminFeeInWei Check on whether master admin pool fee is paid out in Ether.
     * @param _payoutWallet Address where funds collected will be sent to
     * @param _adminPayoutWallet Address where admin fees goes to
     * @param _poolbasePayoutWallet Address where poolbase fees goes to
     * @param _eventEmitter Address of event emitter contract
     * If not then it is paid out in ERC20 tokens
     * @param _admins List of pool admin addresses.
     */
    function init(
        address[2] _bouncers,
        uint256 _maxAllocation,
        uint256[2] _adminPoolFee,
        uint256[2] _poolbaseFee,
        bool _isAdminFeeInWei,
        address _payoutWallet,
        address _adminPayoutWallet,
        address _poolbasePayoutWallet,
        address _eventEmitter,
        address[] _admins
    )
    external
    {
        require(
            maxAllocation == 0 &&
            adminPoolFee[0] == 0 &&
            adminPoolFee[1] == 0 &&
            poolbaseFee[0] == 0 &&
            poolbaseFee[1] == 0 &&
            payoutWallet == address(0) &&
            adminPayoutWallet == address(0) &&
            poolbasePayoutWallet == address(0) &&
            eventEmitter == address(0),
            "Global variables should have not been set before"
        );
        require(
            _maxAllocation != 0 &&
            _adminPoolFee[0] != 0 &&
            _adminPoolFee[1] != 0 &&
            _poolbaseFee[0] != 0 &&
            _poolbaseFee[1] != 0 &&
            _adminPayoutWallet != address(0) &&
            _poolbasePayoutWallet != address(0) &&
            _eventEmitter != address(0),
            "params variables cannot be empty but payoutWallet"
        );

        maxAllocation = _maxAllocation;
        adminPoolFee = _adminPoolFee;
        poolbaseFee = _poolbaseFee;
        isAdminFeeInWei = _isAdminFeeInWei;
        payoutWallet = _payoutWallet;
        adminPayoutWallet = _adminPayoutWallet;
        poolbasePayoutWallet = _poolbasePayoutWallet;
        eventEmitter = PoolbaseEventEmitter(_eventEmitter);

        addRole(msg.sender, ROLE_BOUNCER); // adds msg.sender (poolbaseCloneFactory) as bouncer
        for (uint8 i = 0; i < _bouncers.length; i++) {
            addRole(_bouncers[i], ROLE_BOUNCER);
        }

        addRole(tx.origin, ROLE_ADMIN); // add poolbase creator as an admin
        for (uint8 j = 0; j < _admins.length; j++) {
            // add addresses within the array as pool admins
            addRole(_admins[j], ROLE_ADMIN);
        }

        state = State.Active;
    }

    /**
     * @dev called by the bouncer to pause, triggers stopped state
     */
    function pause() external onlyRole(ROLE_BOUNCER) whenNotPaused {
        paused = true;
        eventEmitter.logPausedEvent(address(this), msg.sender);
    }

    /**
     * @dev called by the bouncer to unpause, returns to normal state
     */
    function unpause() external onlyRole(ROLE_BOUNCER) whenPaused {
        paused = false;
        eventEmitter.logUnpausedEvent(address(this), msg.sender);
    }

    /**
     * @dev emergency function to set the pool state to refunding
     */
    function emergencySetStateToRefunding() external onlyRole(ROLE_BOUNCER) {
        state = State.Refunding;
        eventEmitter.logRefundsEnabledEvent(address(this), msg.sender);
    }

    /**
     * @dev emergency function that allows payoutAddress to send ether to contract
     * used when payout address want to send ether back to contract for emergency reasons
     */
    function emergencyReceiveWeiFromPayoutAddress() external payable {
        require(msg.sender == payoutWallet);
    }

    /**
     * @dev emergency function that sets the flag for fallback function to accept ether from any address
     */
    function emergencyAcceptAllPayments(bool willAccept) external onlyRole(ROLE_BOUNCER) payable {
        acceptAllPayments = willAccept;
    }

    /**
     * @dev emergency function that sets the flag on poolbase behalf
     * used when there is either a ether removal from the contract or tokens removed from the contract
     * for reasons such as bug found in contract, etc
     */
    function vouchAsPoolBase() external onlyRole(ROLE_BOUNCER) {
        poolbaseVouched = true;
    }

    /**
     * @dev emergency function that sets the flag on pool admin behalf
     * used when there is either a ether removal from the contract or tokens removed from the contract
     * for reasons such as bug found in contract, etc
     */
    function vouchAsAdmin() external onlyRole(ROLE_ADMIN) {
        adminVouched = true;
    }

    /**
     * @dev emergency function to remove ether from contract. Must have vouches from both pool admin and poolbase
     */
    function emergencyRemoveWei(address beneficiary, uint256 _value) external onlyRole(ROLE_ADMIN) {
        require
        (
            beneficiary != address(0) &&
            _value != 0 && poolbaseVouched &&
            adminVouched
        );

        beneficiary.transfer(_value);
    }

    /**
     * @dev emergency function to remove erc20 tokens from contract.
     * Must have vouches from both pool admin and poolbase
     */
    function emergencyRemoveTokens
        (
            ERC20 _tokenAddress,
            address beneficiary,
            uint256 _value
        )
            external
            onlyRole(ROLE_ADMIN)
    {
        require
        (
            beneficiary != address(0) &&
            _value != 0 && poolbaseVouched &&
            adminVouched
        );

        ERC20(_tokenAddress).transfer(beneficiary, _value);
    }

    /*
     * Modify fees and allocation functions
     */
    /**
     * @dev Sets new poolbasePayoutWallet. Only poolbase bouncers are able to change this
     * @param _newPoolbasePayoutWallet Address of new poolbase payout wallet
     */
    function setPoolbasePayoutWallet(address _newPoolbasePayoutWallet) external onlyRole(ROLE_BOUNCER) whenNotPaused {
        require(_newPoolbasePayoutWallet != 0);
        poolbasePayoutWallet = _newPoolbasePayoutWallet;
    }

    /**
     * @dev Sets new adminPayoutWallet. Only admins are able to change this
     * @param _newAdminPayoutWallet Address of new admin payout wallet
     */
    function setAdminPayoutWallet(address _newAdminPayoutWallet) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(_newAdminPayoutWallet != 0);
        adminPayoutWallet = _newAdminPayoutWallet;
        eventEmitter.logSetAdminPayoutWalletEvent(address(this), msg.sender, adminPayoutWallet);
    }

    /**
     * @dev Sets new adminPoolFee. Admins only
     * @param _newAdminPoolFee List with two elements referencing admin pool fee as a fraction
     * e.g. 1/2 is [1,2]
     */
    function setAdminPoolFee(uint256[2] _newAdminPoolFee) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(_newAdminPoolFee[0] != 0 && _newAdminPoolFee[1] != 0);
        adminPoolFee[0] = _newAdminPoolFee[0];
        adminPoolFee[1] = _newAdminPoolFee[1];
        eventEmitter.logSetAdminPoolFeeEvent(address(this), msg.sender, _newAdminPoolFee);
    }

    /**
     * @dev Sets new poolbaseFee. Pollbase bouncers only allowed to change the fee
     * @param _newPoolbaseFee List with two elements referencing poolbase fee as a fraction
     * e.g. 2/5 is [2,5]
     */
    function setPoolbaseFee(uint256[2] _newPoolbaseFee) external onlyRole(ROLE_BOUNCER) whenNotPaused {
        require(_newPoolbaseFee[0] != 0 && _newPoolbaseFee[1] != 0);
        poolbaseFee[0] = _newPoolbaseFee[0];
        poolbaseFee[1] = _newPoolbaseFee[1];
    }

    /**
     * @dev Changes maxAllocation. Admins are the only ones permitted to perform this action
     * @param _newMaxAllocation Figure for the maximum allocation
     */
    function changeMaxAllocation(uint256 _newMaxAllocation) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(_newMaxAllocation != 0);
        maxAllocation = _newMaxAllocation;
        eventEmitter.logChangeMaxAllocationEvent(address(this), msg.sender, maxAllocation);
    }

    /*
     * Investing Mechanisms
     */
    /**
     * @dev Pool contributors deposit funds by callling this function with a signature of the poolbase bouncer
     * @param sig poolbase signature
     */
    function deposit(bytes sig) external onlyValidSignature(sig) whenNotPaused payable {
        require(state == State.Active);
        require(address(this).balance <= maxAllocation);
        deposited[msg.sender] = deposited[msg.sender].add(msg.value);

        eventEmitter.logContributionEvent(address(this), msg.sender, msg.value);
    }

    /**
     * @dev Allows admin to enable refunds for pool contributors. Done in case pool admin find pool was unsuccessful
     */
    function enableRefunds() external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(state == State.Active);
        state = State.Refunding;

        eventEmitter.logRefundsEnabledEvent(address(this), msg.sender);
    }

    /**
     * @dev Sets token and token payout event. Admin sets ERC20 token that pool contributors receives from contributions
     * @param _token ERC20 contract address of claimable token
     */
    function adminSetsBatch(ERC20 _token) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(state == State.Closed || state == State.TokenPayout);
        require(totalWeiRaised != 0);
        if(token == address(0)) {
            token = ERC20(_token);
        }
        else{
            require(address(token) == address(_token));
        }
        state = State.TokenPayout;

        require(token.balanceOf(this) != 0);

        uint256 currentTokensInContract = token.balanceOf(this);

        totalTokens = currentTokensInContract.add(allTokensClaimedByInvestors);
        eventEmitter.logTokenPayoutEnabledEvent(address(this), msg.sender);
    }

     /**
      * @dev Pool contributors uses to receive refunds
      * @param sig poolbase signature so contributors use poolbase app to call this function
      */
    function refund(bytes sig) external onlyValidSignature(sig) whenNotPaused {
        require(state == State.Active || state == State.Refunding);
        uint256 depositedValue = deposited[msg.sender];

        deposited[msg.sender] = 0;
        msg.sender.transfer(depositedValue);
        eventEmitter.logRefundedEvent(address(this), msg.sender, depositedValue);
    }

    /**
     * @dev Function for pool contributors to claim their tokens
     * @param sig poolbase signature
     */
    function claimToken(bytes sig)
        external
        onlyValidSignature(sig)
        whenNotPaused
    {
        require(state == State.TokenPayout);
        require(deposited[msg.sender] != 0);

        uint256 totalClaimableTokens;

        totalClaimableTokens = totalTokens.mul(deposited[msg.sender]).div(totalWeiRaised);

        totalClaimableTokens = totalClaimableTokens.sub(tokenClaimed[msg.sender]);
        require(totalClaimableTokens != 0);

        allTokensClaimedByInvestors = allTokensClaimedByInvestors.add(totalClaimableTokens);
        tokenClaimed[msg.sender] = tokenClaimed[msg.sender].add(totalClaimableTokens);

        token.transfer(msg.sender, totalClaimableTokens);
        eventEmitter.logTokenClaimedEvent(address(this), msg.sender, totalClaimableTokens, token);
    }

    /**
     * @dev Permits admin to close pool and receive collected ether
     * @param _payoutWallet when passed, it overrides global payoutWallet variable
     * @param txData optional hash for calling a function in a smart contract where funds go
     */
    function adminClosesPool(address _payoutWallet, bytes txData) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(state == State.Active);

        if (_payoutWallet != address(0)) {
            payoutWallet = _payoutWallet;
        }

        // ensures payout address is set
        require(payoutWallet != address(0));

        close(txData);
    }

    /**
     * @dev Internal function with core logic of pool closing event
     * @param txData Used when close function must send a low level function to a smart contract.
     * if not used then pass as 0(zero) bytes
     */
    function close(bytes txData) internal {
        state = State.Closed;
        eventEmitter.logClosedEvent(address(this), msg.sender);
        totalWeiRaised = address(this).balance;

        uint poolbaseNumerator = poolbaseFee[0];
        uint poolbaseDenominator = poolbaseFee[1];
        uint256 poolBaseReward = totalWeiRaised.mul(poolbaseNumerator).div(poolbaseDenominator);
        poolbasePayoutWallet.transfer(poolBaseReward);

        uint adminPoolFeeNumerator = adminPoolFee[0];
        uint adminPoolFeeDenominator = adminPoolFee[1];
        uint256 adminReward = totalWeiRaised.mul(adminPoolFeeNumerator).div(adminPoolFeeDenominator);

        if (isAdminFeeInWei) {
            adminPayoutWallet.transfer(adminReward);

            transferPoolFunds(txData);
        } else {
            // add adminReward on top of the payout value
            totalWeiRaised = totalWeiRaised.add(adminReward);
            deposited[adminPayoutWallet] = deposited[adminPayoutWallet].add(adminReward);

            transferPoolFunds(txData);
        }
    }

    /**
     * @dev Internal function for sending pool funds to payoutWallet
     * @param txData Used when close function must send a low level function to a smart contract.
     */
    function transferPoolFunds(bytes txData) internal {
        // external_call is same as using `payoutWallet.call.value(address(this).balance)(txData);`
        // if external call returns false ie no method found then send balance to address of payoutWallet
        if (!external_call(payoutWallet, address(this).balance, txData.length, txData)) {
            payoutWallet.transfer(address(this).balance);
        }
    }

    // call has been separated into its own function in order to take advantage
    // of the Solidity's code generator to produce a loop that copies tx.data into memory.
    function external_call(address destination, uint value, uint dataLength, bytes data) internal returns (bool) {
        bool result;
        assembly {
            let x := mload(0x40)   // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
            let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
                sub(gas, 34710),   // 34710 is the value that solidity is currently emitting
                                   // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
                                   // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
                destination,
                value,
                d,
                dataLength,        // Size of the input (in bytes) - this is what fixes the padding problem
                x,
                0                  // Output is ignored, therefore the output size is zero
            )
        }
        return result;
    }
}
