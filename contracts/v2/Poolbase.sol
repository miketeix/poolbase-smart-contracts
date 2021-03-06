pragma solidity 0.4.24;

import "../PoolbaseEventEmitter.sol";
import "../lib/SafeMath.sol";
import "../lib/SignatureBouncer.sol";
import "../lib/ERC20.sol";
import "./PoolbaseInterface.sol";


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
