import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

pragma solidity 0.4.23;


contract TokenMock is MintableToken {
    constructor(address recipient, uint256 tokenToMint) public {
        mint(recipient, tokenToMint);
    }
}
