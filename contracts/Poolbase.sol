pragma solidity 0.4.23;

/* There is no minimum contribution for the total amount of eth collected
There is a 0.4% as default contribution to Poolbase - add a function setPoolbaseFee

superAdmin - hardcoded addresses by Poolbase to set Poolbase fee. (Two addresses)
emergency function to deactivate the first superAdmin address

poolCap ie maxAllocation can be changed via a function that only admins are able to call
min and maxContributionPerInvestor can be changed via a function that only admins are able to call

invest function where users can send eth. Fallback function should call invest()
investors are able to withdraw their investment at any moment until the pool is finalized
payments are rejected once pool is finalized or cap is reached

finalize function that is called by masterAdmin and a payoutAddress is passed as a params.
On pool finalization, pool fee is paid as well as Poolbase fee is paid. Funds are sent to payoutAddress.
only masterAdmin can finalize a pool

confirm function
* pool admin provides token address and will confirm token balance
* check whether the token balance from the token address provided is existent
* the percentage of ETH invested per individual will be equal to the percentage
 of tokens of the smart contract they will receive even if payments are done in batches.

emergency token function. Send tokens back to the ICO team in case there is a mistake.
Should be called by the superAdmin address owned by Poolbase. */

contract Poolbase {
    // global variables
    address public masterAdmin;
    uint256 public maxAllocation;
    uint256 public minContributionPerInvestor;
    uint256 public maxContributionPerInvestor;
    uint256 public adminPoolFee;
    bool public isAdminFeeInWei;

    uint256 public poolbaseFee = 4; // percentage fee for poolbase. Default is 4%

    mapping(address => bool) public superAdmins;
    mapping(address => bool) public admins;

    /*
     * @dev Constructor function of Poolbase contract
     * @param _superAdmins List of super admin addresses. They belong to Poolbase.io
     * @param _maxAllocation Pool cap in wei
     * @param _minContributionPerInvestor Minimum amount each investor is allowed
     * @param _maxContributionPerInvestor Maximum amount each investor is allowed
     * @param _adminPoolFee Percentage from the pool that goes to master admin pool
     * @param _isAdminFeeInWei Check on whether master admin pool fee is paid out in Ether.
     * If not then it is paid out in ERC20 tokens
     * @param _admins List of pool admin addresses.
     */
    constructor(
        address[] _superAdmins,
        uint256 _maxAllocation,
        uint256 _minContributionPerInvestor,
        uint256 _maxContributionPerInvestor,
        uint256 _adminPoolFee,
        bool _isAdminFeeInWei,
        address[] _admins
    ) public {
        masterAdmin = msg.sender;
        maxAllocation = _maxAllocation;
        minContributionPerInvestor = _minContributionPerInvestor;
        maxContributionPerInvestor = _maxContributionPerInvestor;
        adminPoolFee = _adminPoolFee;
        isAdminFeeInWei = _isAdminFeeInWei;

        for (uint8 i = 0; i <= 2; i++) {
            superAdmins[_superAdmins[i]] = true;
        }

        for (uint8 j = 0; j <= 5; j++) {
            admins[_admins[j]] = true;
        }
    }

    modifier onlySuperAdmins() {
        require(superAdmins[msg.sender]);
        _;
    }

    modifier onlyAdmins() {
        require(admins[msg.sender]);
        _;
    }

    function setPoolbaseFee(uint256 _poolbaseFee) external onlySuperAdmins {
        require(_poolbaseFee != 0);
        poolbaseFee = _poolbaseFee;
    }

    function setAdminPoolFee(uint256 _adminPoolFee) external onlyAdmins {
        require(_adminPoolFee != 0);
        adminPoolFee = _adminPoolFee;
    }

    function changeMaxAllocation(uint256 _maxAllocationocation) external onlyAdmins {
        require(_maxAllocationocation != 0);
        maxAllocation = _maxAllocationocation;
    }
}
