import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol';

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
    bool public tokenAddressConfirmed;
    // default is 100%
    uint256 public percentageOfTokensAllowedToClaim = 100;

    ERC20 public token;
    // refund vault used to hold funds while pool is running
    RefundVault public vault;

    mapping (address => uint256) public tokenEntitlements;

    event ContributionMade(address indexed investor, uint256 contribution);
    event TokenConfirmed(address tokenAddress);
    event TokensClaimed(address indexed investor, uint256 claimed);

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
     * @dev Finalize pool and add ERC20 token for distribution
     * @param _tokenAddress ERC20 token contract address
     */
    function finalizePool(ERC20 _tokenAddress) public {
        require(msg.sender == admin);
        require(now > endTime);

        if (weiRaised >= threshold) {
          vault.close();

          tokenAddressConfirmed = true;
          token = ERC20(_tokenAddress);
          require(token.balanceOf(address(this)) >= totalTokens);
          emit TokenConfirmed(_tokenAddress);
        } else {
          vault.enableRefunds();
        }
    }

    /*
     * @dev Change the percentage of tokens to claim
     * @param _percentageOfTokensAllowedToClaim New percentage figure
     */
    function setTokenClaimPercentage(uint256 _percentageOfTokensAllowedToClaim) public {
        require(msg.sender == admin);

        percentageOfTokensAllowedToClaim = _percentageOfTokensAllowedToClaim;
    }

    /*
     * @dev Allow investors to claim their purchase tokens
     */
    function claimEntitledTokens() public {
        require(tokenAddressConfirmed);
        require(tokenEntitlements[msg.sender] > 0);

        uint256 tokensToClaim = tokenEntitlements[msg.sender].mul(percentageOfTokensAllowedToClaim).div(100);
        tokenEntitlements[msg.sender] = tokenEntitlements[msg.sender].sub(tokensToClaim);
        token.transfer(msg.sender, tokensToClaim);
        emit TokensClaimed(msg.sender, tokensToClaim);
    }
}
