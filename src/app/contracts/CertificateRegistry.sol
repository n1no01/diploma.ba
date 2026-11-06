// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    address public owner;
    address public pendingOwner;
    mapping(address => bool) public issuers;
    mapping(string => bool) public validCertificates;
    mapping(string => bool) public revokedCertificates;

    event CertificateRegistered(string certificateHash, address indexed issuer);
    event CertificateRevoked(string certificateHash, address indexed by);
    event IssuerUpdated(address indexed issuer, bool status);
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Samo vlasnik");
        _;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender], "Samo ovlasteni izdavac");
        _;
    }

    function setIssuer(address issuer, bool status) external onlyOwner {
        issuers[issuer] = status;
        emit IssuerUpdated(issuer, status);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Neispravna adresa");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Nisi predlozeni vlasnik");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    function _register(string memory certHash) internal {
        require(bytes(certHash).length == 64, "Hash mora imati 64 znaka");
        require(!revokedCertificates[certHash], "Certifikat je trajno opozvan");
        validCertificates[certHash] = true;
        emit CertificateRegistered(certHash, msg.sender);
    }

    function registerCertificate(string calldata certHash) external onlyIssuer {
        _register(certHash);
    }

    function registerBatch(string[] calldata certHashes) external onlyIssuer {
        for (uint256 i = 0; i < certHashes.length; i++) {
            _register(certHashes[i]);
        }
    }

    // Opoziv mogu raditi issuer (aplikacija) i owner (hitni slucajevi)
    function revokeCertificate(string calldata certHash) external {
        require(issuers[msg.sender] || msg.sender == owner, "Nemas ovlast");
        require(validCertificates[certHash], "Certifikat nije aktivan");
        validCertificates[certHash] = false;
        revokedCertificates[certHash] = true;
        emit CertificateRevoked(certHash, msg.sender);
    }

    function verifyCertificate(string calldata certHash)
        external view returns (bool isValid, bool isRevoked)
    {
        return (validCertificates[certHash], revokedCertificates[certHash]);
    }
}