// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    address public owner;
    // Mapiranje: Certificate Hash -> Da li je validan
    mapping(string => bool) public validCertificates;

    event CertificateRegistered(string certificateHash);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Samo vlasnik moze registrovati certifikat");
        _;
    }

    // Funkcija za upis hash-a na blockchain
    function registerCertificate(string memory certHash) public onlyOwner {
        validCertificates[certHash] = true;
        emit CertificateRegistered(certHash);
    }

    // Funkcija za provjeru validnosti
    function verifyCertificate(string memory certHash) public view returns (bool) {
        return validCertificates[certHash];
    }
}