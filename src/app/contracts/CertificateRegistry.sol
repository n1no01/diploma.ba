// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    address public owner;
    mapping(string => bool) public validCertificates;
    mapping(string => bool) public revokedCertificates;

    event CertificateRegistered(string certificateHash);
    event CertificateRevoked(string certificateHash);
    event BatchCertificatesRegistered(uint256 count);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Samo vlasnik");
        _;
    }

    function registerCertificate(string memory certHash) public {
        validCertificates[certHash] = true;
        revokedCertificates[certHash] = false;
        emit CertificateRegistered(certHash);
    }

    function registerBatch(string[] memory certHashes) public {
        for (uint i = 0; i < certHashes.length; i++) {
            validCertificates[certHashes[i]] = true;
            revokedCertificates[certHashes[i]] = false;
            emit CertificateRegistered(certHashes[i]);
        }
        emit BatchCertificatesRegistered(certHashes.length);
    }

    function revokeCertificate(string memory certHash) public onlyOwner {
        validCertificates[certHash] = false;
        revokedCertificates[certHash] = true;
        emit CertificateRevoked(certHash);
    }

    function verifyCertificate(string memory certHash) public view returns (bool isValid, bool isRevoked) {
        return (validCertificates[certHash], revokedCertificates[certHash]);
    }
}