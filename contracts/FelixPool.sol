import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';

pragma solidity 0.4.23;


contract FelixPool {
    using SafeMath for uint;
    uint public threshold;
    uint public endTime;
    uint public rate;
    uint public totalTokens;
    uint public totalContributions;
    address public admin;
    bool public tokenAddressConfirmed;

    ERC20 public token;

    mapping (address => uint) public contributions;
    mapping (address => uint) public tokenEntitlement;

    event ContributionMade(address indexed investor, uint contribution);
    event ContributionWithdrawn(address indexed investor, uint contribution);
    event TokenConfirmed(address tokenAddress);
    event TokensClaimed(address indexed investor, uint claimed);

    /*
     * @dev Constructor function of FelixPool contract
     * @param _threshold minimum amount of WEI for the pool to be successful
     * @param _endTime unix timestamp when pool is no longer accepting deposits
     * @param _rate multiplier which defines how many tokens to be received per Ether
     */
    constructor(uint _threshold, uint _endTime, uint _rate) public {
        admin = msg.sender;
        require(_threshold != 0 && _rate != 0);
        require(now < _endTime);

        threshold = _threshold;
        endTime = _endTime;
        rate = _rate;
    }

  /*
   * @dev Fallback
   */
    function () public payable {
        deposit();
    }

    /*
     * @dev Allows contributors to invest in the pool
     */
    function deposit() public payable {
        require(now <= endTime);
        uint value = msg.value;
        uint tokensToReceive = value.mul(rate);

        contributions[msg.sender] = contributions[msg.sender].add(value);
        tokenEntitlement[msg.sender] = tokenEntitlement[msg.sender].add(tokensToReceive);
        totalTokens = totalTokens.add(tokensToReceive);
        totalContributions = totalContributions.add(value);
        emit ContributionMade(msg.sender, value);
    }

    /*
     * @dev Allows contributors to withdral their investments before the pool closes
     * or when the refundsAllowed flag is set
     */
    function withdrawContribution() public {
        require(now <= endTime || refundsAllowed());
        require(contributions[msg.sender] > 0);

        uint withdrawalValue = contributions[msg.sender];
        totalTokens = totalTokens.sub(tokenEntitlement[msg.sender]);
        totalContributions = totalContributions.sub(contributions[msg.sender]);

        tokenEntitlement[msg.sender] = 0;
        contributions[msg.sender] = 0;
        msg.sender.transfer(withdrawalValue);

        emit ContributionWithdrawn(msg.sender, withdrawalValue);
    }

    /*
     * @dev Add ERC20 token for the contract
     * @param _tokenAddress ERC20 token contract address
     */
    function confirmTokenAddress(ERC20 _tokenAddress) public {
        require(msg.sender == admin);
        require(now > endTime);

        tokenAddressConfirmed = true;
        token = ERC20(_tokenAddress);

        require(token.balanceOf(address(this)) >= totalTokens);
        emit TokenConfirmed(_tokenAddress);
    }

    /*
     * @dev Allow investors to claim their purchase tokens
     */
    function claimEntitledTokens() public {
        require(tokenAddressConfirmed);
        require(tokenEntitlement[msg.sender] > 0);

        uint entitlement = tokenEntitlement[msg.sender];
        tokenEntitlement[msg.sender] = 0;
        token.transfer(msg.sender, entitlement);
        emit TokensClaimed(msg.sender, entitlement);
    }

    function refundsAllowed() internal view returns(bool) {
        return (totalContributions < threshold && now > endTime);
    }
}
