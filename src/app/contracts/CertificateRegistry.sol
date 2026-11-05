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
        require(msg.sender == owner, "Samo vlasnik moze ovo izvrstiti");
        _;
    }

    function registerCertificate(string memory certHash) public onlyOwner {
        require(!revokedCertificates[certHash], "Certifikat je trajno opozvan i ne moze se ponovo izdati");
        validCertificates[certHash] = true;
        emit CertificateRegistered(certHash);
    }

    function registerBatch(string[] memory certHashes) public onlyOwner {
        for (uint i = 0; i < certHashes.length; i++) {
            require(!revokedCertificates[certHashes[i]], "Jedan od certifikata u grupi je opozvan");
            validCertificates[certHashes[i]] = true;
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