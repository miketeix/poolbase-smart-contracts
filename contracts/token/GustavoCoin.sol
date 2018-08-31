pragma solidity 0.4.24;

import './MintableToken.sol';

contract GustavoCoin is MintableToken {
    string public name = "GUSTAVO COIN";
    string public symbol = "GUS";
    uint8 public decimals = 18;
}
