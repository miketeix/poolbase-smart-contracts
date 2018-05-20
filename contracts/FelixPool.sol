import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';

pragma solidity 0.4.23;


contract FelixPool {
    using SafeMath for uint256;
    uint256 public threshold;
    uint256 public cap;
    uint256 public endTime;
    uint256 public rate;
    uint256 public totalTokens;
    uint256 public weiRaised;
    address public admin;

    uint256 public cliff;
    uint256 public start;
    uint256 public duration;

    ERC20 public token;
    // refund vault used to hold funds while pool is running
    RefundVault public vault;

    mapping (address => uint256) public releasedTokens;
    mapping (address => uint256) public tokenEntitlements;

    event ContributionMade(address indexed investor, uint256 contribution);
    event Released(address beneficiary, uint256 amount);

    /*
     * @dev Constructor function of FelixPool contract
     * @param _threshold minimum amount of WEI for the pool to be successful
     * @param _cap max amount of WEI accepted
     * @param _endTime unix timestamp when pool is no longer accepting deposits
     * @param _rate multiplier which defines how many tokens to be received per Ether
     * @param _wallet Multisig Wallet Address where the pool funds will go to
     */
    constructor(
        uint256 _threshold,
        uint256 _cap,
        uint256 _endTime,
        uint256 _rate,
        address wallet
    )
        public
    {
        admin = msg.sender;
        require(_threshold != 0 && _rate != 0 && _cap != 0 && wallet != address(0));
        require(now < _endTime);
        require(_threshold < _cap);

        threshold = _threshold;
        cap = _cap;
        endTime = _endTime;
        rate = _rate;
        vault = new RefundVault(wallet);
    }

  /*
   * @dev Fallback
   */
    function () public payable {
        invest();
    }

    /*
     * @dev Allows contributors to invest in the pool
     */
    function invest() public payable {
        require(now <= endTime);
        require(weiRaised.add(msg.value) <= cap);

        uint256 tokensToReceive = msg.value.mul(rate);
        tokenEntitlements[msg.sender] = tokenEntitlements[msg.sender].add(tokensToReceive);
        totalTokens = totalTokens.add(tokensToReceive);

        vault.deposit.value(msg.value)(msg.sender);
        weiRaised = weiRaised.add(msg.value);
        emit ContributionMade(msg.sender, msg.value);
    }

    /**
     * @dev Investors can claim refunds if pool is unsuccessful
     */
    function claimRefund() public {
      require(now > endTime && weiRaised < threshold);
      uint256 investedValue = vault.deposited(msg.sender);
      uint256 tokensToSubtract = tokenEntitlements[msg.sender];
      tokenEntitlements[msg.sender] = 0;

      weiRaised = weiRaised.sub(investedValue);
      totalTokens = totalTokens.sub(tokensToSubtract);
      vault.refund(msg.sender);
    }

    /*
     * @dev Finalize pool setting token and its distribution rules
     * @param _token ERC20 address
     * @param _start timestamp representing the beginning of the token vesting process
     * @param _cliff duration in seconds of the cliff in which tokens will begin to vest. ie 1 year in secs
     * @param _duration time in seconds of the period in which the tokens completely vest. ie 4 years in secs
     */
    function finalizePool
    (
        ERC20 _token,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration
    )
        public
    {
        require(msg.sender == admin);
        require(now > endTime);

        if (weiRaised >= threshold) {
          vault.close();

          require(_token != address(0) && _cliff != 0);
          require(_cliff <= _duration);
          require(_start > now);

          duration = _duration;
          cliff = _start.add(_cliff);
          start = _start;

          token = ERC20(_token);
          require(token.balanceOf(address(this)) >= totalTokens);
        } else {
          vault.enableRefunds();
        }
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() public {
        uint256 unreleased = releasableAmount();

        require(unreleased > 0);

        releasedTokens[msg.sender] = releasedTokens[msg.sender].add(unreleased);

        token.transfer(msg.sender, unreleased);

        emit Released(msg.sender, unreleased);
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     */
    function releasableAmount() public view returns (uint256) {
        return vestedAmount().sub(releasedTokens[msg.sender]);
    }

    /**
     * @dev Calculates the amount that has already vested.
     */
    function vestedAmount() public view returns (uint256) {
        uint256 totalBalance = tokenEntitlements[msg.sender];

        if (now < cliff) {
            return 0;
        } else if (now >= start.add(duration)) {
            return totalBalance;
        } else {
            return totalBalance.mul(now.sub(start)).div(duration);
        }
    }
}
