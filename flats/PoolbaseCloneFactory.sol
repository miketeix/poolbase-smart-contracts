pragma solidity 0.4.24;

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

// File: contracts/v2/CloneFactory.sol

/*
The MIT License (MIT)

Copyright (c) 2018 Murray Software, LLC.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
//solhint-disable max-line-length
//solhint-disable no-inline-assembly

contract CloneFactory {

  event CloneCreated(address indexed target, address clone);

  function createClone(address target) internal returns (address result) {
    bytes memory clone = hex"3d602d80600a3d3981f3363d3d373d3d3d363d73bebebebebebebebebebebebebebebebebebebebe5af43d82803e903d91602b57fd5bf3";
    bytes20 targetBytes = bytes20(target);
    for (uint i = 0; i < 20; i++) {
      clone[20 + i] = targetBytes[i];
    }
    assembly {
      let len := mload(clone)
      let data := add(clone, 0x20)
      result := create(0, data, len)
    }
  }
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

// File: contracts/v2/PoolbaseCloneFactory.sol

contract PoolbaseCloneFactory is Ownable, CloneFactory {
    // poolbase contract address for cloning purposes
    address public libraryAddress;
    address[2] public superBouncers;
    address public poolbasePayoutWallet;

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
     * @param _poolbaseFee Percentage from the pool that goes to Poolbase
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
        uint256[2] _poolbaseFee,
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
            _poolbaseFee,
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
            _poolbaseFee,
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
