pragma solidity 0.4.24;

import "./SignatureBouncer.sol";


contract SignatureBouncerMock is SignatureBouncer {
    function checkValidSignature(address _address, bytes _sig)
        public
        view
        returns (bool)
    {
        return isValidSignature(_address, _sig);
    }

    function onlyWithValidSignature(bytes _sig) public onlyValidSignature(_sig) view {}

    function checkValidSignatureAndMethod(address _address, bytes _sig)
        public
        view
        returns (bool)
    {
        return isValidSignatureAndMethod(_address, _sig);
    }

    function onlyWithValidSignatureAndMethod(bytes _sig) public onlyValidSignatureAndMethod(_sig) view
    {}

    function checkValidSignatureAndData(address _address, bytes _bytes, uint _val, bytes _sig)
        public
        view
        returns (bool)
    {
        return isValidSignatureAndData(_address, _sig);
    }

    function onlyWithValidSignatureAndData(uint _val, bytes _sig) public onlyValidSignatureAndData(_sig) view
    {}
}
