pragma solidity 0.4.24;

/**
 * @dev Used for testing purposes for Poolbase#close
 */
contract ReceivePoolPayoutMock {
    uint256 public balance;
    function receivePayout() public payable {
        balance += msg.value;
    }
}
