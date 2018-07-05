pragma solidity 0.4.23;

import "./PoolbaseEventEmitter.sol";
import "./helpers/SafeMath.sol";
import "./helpers/SignatureBouncer.sol";
import "./helpers/ERC20.sol";


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

    bool public paused = false;
    ERC20 public token;

    /* State vars */
    enum State { Active, Refunding, Closed, TokenPayout }
    State public state;

    struct Batch {
        uint256 rate;
        uint256 totalTokens;
    }

    uint256 public numOfBatches;
    uint256 public allTokensClaimedByInvestors;

    mapping (address => uint256) public deposited;
    mapping (address => uint256) public tokenClaimed;
    mapping (uint256 => Batch) public batches;

    /* External Contract */
    PoolbaseEventEmitter public eventEmitter;

    /*
     * @dev Constructor function of Poolbase contract
     * @param _superBouncers List of super admin previlege addresses. They belong to Poolbase.io
     * @param _maxAllocation Pool cap in wei
     * @param _adminPoolFee Percentage from the pool that goes to master admin pool
     * @param _poolbaseFee Percentage from the pool that goes to Poolbase
     * @param _isAdminFeeInWei Check on whether master admin pool fee is paid out in Ether.
     * @param _payoutwallet Address where funds collected will be sent to at the end
     * @param _adminPayoutWallet Address where admin fees goes to
     * @param _poolbasePayoutWallet Address where poolbase fees goes to
     * @param _eventEmitterContract Address of event emitter contract
     * If not then it is paid out in ERC20 tokens
     * @param _admins List of pool admin addresses.
     */
    constructor(
        address[] _superBouncers,
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
        public
        SignatureBouncer(_superBouncers)
    {
        maxAllocation = _maxAllocation;
        adminPoolFee = _adminPoolFee;
        poolbaseFee = _poolbaseFee;
        isAdminFeeInWei = _isAdminFeeInWei;
        payoutWallet = _payoutWallet;
        adminPayoutWallet = _adminPayoutWallet;
        poolbasePayoutWallet = _poolbasePayoutWallet;
        eventEmitter = PoolbaseEventEmitter(_eventEmitterContract);

        for (uint8 i = 0; i < _admins.length; i++) {
            addRole(_admins[i], ROLE_ADMIN);
        }

        state = State.Active;
    }

    /*
     *  Pausing Mechanism
    */
    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!paused);
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        require(paused);
        _;
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() external onlyRole(ROLE_BOUNCER) whenNotPaused {
        paused = true;
        eventEmitter.logPausedEvent(address(this));
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
     */
    function unpause() external onlyRole(ROLE_BOUNCER) whenPaused {
        paused = false;
        eventEmitter.logUnpausedEvent(address(this));
    }

    function emergencyRemoveWei(uint256 _value) external onlyRole(ROLE_BOUNCER) {
        require(_value != 0);
        poolbasePayoutWallet.transfer(_value);
    }

    function emergencyRemoveTokens(ERC20 _tokenAddress, uint256 _value) external onlyRole(ROLE_BOUNCER) {
        require(_value != 0);
        ERC20(_tokenAddress).transfer(poolbasePayoutWallet, _value);
    }

    /*
     * Modify fees and allocation functions
     */
    function setPoolbasePayoutWallet(address _poolbasePayoutWallet) external onlyRole(ROLE_BOUNCER) whenNotPaused {
        require(_poolbasePayoutWallet != 0);
        poolbasePayoutWallet = _poolbasePayoutWallet;
    }

    function setAdminPayoutWallet(address _adminPayoutWallet) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(_adminPayoutWallet != 0);
        adminPayoutWallet = _adminPayoutWallet;
    }

    function setAdminPoolFee(uint256[2] _adminPoolFee) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(_adminPoolFee[0] != 0 && _adminPoolFee[1] != 0);
        adminPoolFee[0] = _adminPoolFee[0];
        adminPoolFee[1] = _adminPoolFee[1];
    }

    function setPoolbaseFee(uint256[2] _poolbaseFee) external onlyRole(ROLE_BOUNCER) whenNotPaused {
        require(_poolbaseFee[0] != 0 && _poolbaseFee[1] != 0);
        poolbaseFee[0] = _poolbaseFee[0];
        poolbaseFee[1] = _poolbaseFee[1];
    }

    function changeMaxAllocation(uint256 _maxAllocation) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(_maxAllocation != 0);
        maxAllocation = _maxAllocation;
    }

    /*
     * Investing Mechanisms
     */
    /**
     * @param sig poolbase signature
     */
    function deposit(bytes sig) external onlyValidSignature(sig) whenNotPaused payable {
        require(state == State.Active);
        require(address(this).balance.add(msg.value) <= maxAllocation);
        deposited[msg.sender] = deposited[msg.sender].add(msg.value);

        if (address(this).balance.add(msg.value) == maxAllocation) {
            close();
        }
    }

    function enableRefunds() external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(state == State.Active);
        state = State.Refunding;
        eventEmitter.logRefundsEnabledEvent(address(this));
    }

    function adminSetsBatch(ERC20 _token) external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(state == State.Closed || state == State.TokenPayout);
        state = State.TokenPayout;

        token = ERC20(_token);
        require(token.balanceOf(this) != 0);

        uint256 totalTokensFromAllPreviousBatches;

        if (numOfBatches > 0) {
            for (uint8 i = 0; i < numOfBatches; i++) {
                totalTokensFromAllPreviousBatches = totalTokensFromAllPreviousBatches.add(batches[i].totalTokens);
            }
        }

        uint256 currentTokensInContract = token.balanceOf(this);

        batches[numOfBatches].totalTokens = currentTokensInContract
                                            .add(allTokensClaimedByInvestors)
                                            .sub(totalTokensFromAllPreviousBatches);

        batches[numOfBatches].rate = batches[numOfBatches].totalTokens / totalWeiRaised;

        eventEmitter.logTokenPayoutEnabledEvent(address(this));
        numOfBatches = numOfBatches.add(1);
    }

     /**
      * @param sig poolbase signature
      */
    function refund(bytes sig) external onlyValidSignature(sig) whenNotPaused {
        require(state == State.Active || state == State.Refunding);
        uint256 depositedValue = deposited[msg.sender];
        deposited[msg.sender] = 0;
        msg.sender.transfer(depositedValue);
        eventEmitter.logRefundedEvent(address(this), msg.sender, depositedValue);
    }

    function claimToken(bytes sig)
        external
        onlyValidSignature(sig)
        whenNotPaused
    {
        require(state == State.TokenPayout);
        require(deposited[msg.sender] != 0);

        uint256 totalClaimableTokens;
        if (numOfBatches > 0) {
            for (uint8 i = 0; i < numOfBatches; i++) {
                totalClaimableTokens = totalClaimableTokens.add(batches[i].rate.mul(deposited[msg.sender]));
            }
        }
        totalClaimableTokens = totalClaimableTokens.sub(tokenClaimed[msg.sender]);

        allTokensClaimedByInvestors = allTokensClaimedByInvestors.add(totalClaimableTokens);
        tokenClaimed[msg.sender] = tokenClaimed[msg.sender].add(totalClaimableTokens);

        token.transfer(msg.sender, totalClaimableTokens);
        eventEmitter.logTokenClaimedEvent(address(this), msg.sender, totalClaimableTokens, token);
    }

    function adminClosesPool() external onlyRole(ROLE_ADMIN) whenNotPaused {
        require(state == State.Active);
        close();
    }

    function close() internal {
        state = State.Closed;
        eventEmitter.logClosedEvent(address(this));

        uint poolbaseNumerator = poolbaseFee[0];
        uint poolbaseDenominator = poolbaseFee[1];
        uint256 poolBaseReward = address(this).balance.mul(poolbaseNumerator).div(poolbaseDenominator);
        poolbasePayoutWallet.transfer(poolBaseReward);

        uint adminPoolFeeNumerator = adminPoolFee[0];
        uint adminPoolFeeDenominator = adminPoolFee[1];
        uint256 adminReward = address(this).balance.mul(adminPoolFeeNumerator).div(adminPoolFeeDenominator);

        if (isAdminFeeInWei) {
            adminPayoutWallet.transfer(adminReward);
            totalWeiRaised = address(this).balance;
            payoutWallet.transfer(totalWeiRaised);
        } else {
            // add adminPoolFee on top of the payout value
            totalWeiRaised = address(this).balance.add(adminReward);
            deposited[adminPayoutWallet] = deposited[adminPayoutWallet].add(adminReward);
            payoutWallet.transfer(address(this).balance);
        }
    }
}
