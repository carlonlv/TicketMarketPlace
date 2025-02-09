// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ITicketNFT} from "./interfaces/ITicketNFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TicketNFT} from "./TicketNFT.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol"; 
import {ITicketMarketplace} from "./interfaces/ITicketMarketplace.sol";
import "hardhat/console.sol";

contract TicketMarketplace is ITicketMarketplace {
    struct Event {
        uint128 nextTicketToSell;
        uint128 maxTickets;
        uint256 pricePerTicket;
        uint256 pricePerTicketERC20;
    }

    address public owner;
    address public ERC20Address;
    address public nftContract;
    Event[] public events;
    uint128 public currentEventId;

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized access");
        _;
    }

    constructor(address _ERC20Address) {
        owner = msg.sender;
        ERC20Address = _ERC20Address;
        nftContract = address(new TicketNFT());
        currentEventId = 0;
    }

    function createEvent(uint128 maxTickets, uint256 pricePerTicket, uint256 pricePerTicketERC20) external onlyOwner {
        events.push(Event({
            nextTicketToSell: 0,
            maxTickets: maxTickets,
            pricePerTicket: pricePerTicket,
            pricePerTicketERC20: pricePerTicketERC20
        }));
        currentEventId += 1;
        emit EventCreated(uint128(events.length - 1), maxTickets, pricePerTicket, pricePerTicketERC20);
    }

    function setMaxTicketsForEvent(uint128 eventId, uint128 newMaxTickets) external onlyOwner {
        require(eventId < currentEventId, "Invalid event ID");
        Event storage event_ = events[eventId];
        require(newMaxTickets >= event_.maxTickets, "The new number of max tickets is too small!");
        event_.maxTickets = newMaxTickets;
        emit MaxTicketsUpdate(eventId, newMaxTickets);
    }

    function setPriceForTicketETH(uint128 eventId, uint256 price) external onlyOwner {
        require(eventId < currentEventId, "Invalid event ID");
        Event storage event_ = events[eventId];
        event_.pricePerTicket = price;
        emit PriceUpdate(eventId, price, "ETH");
    }

    function setPriceForTicketERC20(uint128 eventId, uint256 price) external onlyOwner {
        require(eventId < currentEventId, "Invalid event ID");
        Event storage event_ = events[eventId];
        event_.pricePerTicketERC20 = price;
        emit PriceUpdate(eventId, price, "ERC20");
    }

    function buyTickets(uint128 eventId, uint128 ticketCount) payable external {
        require(eventId < currentEventId, "Invalid event ID");
        require(ticketCount > 0, "Ticket count must be > 0");
        Event storage event_ = events[eventId];

        if (event_.pricePerTicket > type(uint256).max / ticketCount) {
            revert("Ticket price calc overflow");
        }
        uint256 totalPrice = ticketCount * event_.pricePerTicket;
        require(msg.value >= totalPrice, "Not enough ETH provided");

        uint128 availableTickets = event_.maxTickets - event_.nextTicketToSell;
        require(ticketCount <= availableTickets, "NoWt enough tickets available");

        uint128 startSeat = event_.nextTicketToSell;
        event_.nextTicketToSell += ticketCount;

        for (uint128 i = 0; i < ticketCount; i++) {
            uint256 nftId = (uint256(eventId) << 128) + startSeat + i;
            ITicketNFT(nftContract).mintFromMarketPlace(msg.sender, nftId);
        }

        emit TicketsBought(eventId, ticketCount, "ETH");
    }

    function buyTicketsERC20(uint128 eventId, uint128 ticketCount) external {
        require(eventId < currentEventId, "Invalid event ID");
        require(ticketCount > 0, "Ticket count must be > 0");
        Event storage event_ = events[eventId];

        if (event_.pricePerTicketERC20 > type(uint256).max / ticketCount) {
            revert("Price calc overflow");
        }
        uint256 totalPriceERC20 = ticketCount * event_.pricePerTicketERC20;

        IERC20 erc20 = IERC20(ERC20Address);
        require(erc20.balanceOf(msg.sender) >= totalPriceERC20, "ERC20 balance too low");
        require(erc20.allowance(msg.sender, address(this)) >= totalPriceERC20, "Allowance too low");

        bool success = erc20.transferFrom(msg.sender, address(this), totalPriceERC20);
        require(success, "ERC20 transfer failed");

        uint128 availableTickets = event_.maxTickets - event_.nextTicketToSell;
        require(ticketCount <= availableTickets, "Not enough tickets available");

        uint128 startSeat = event_.nextTicketToSell;
        event_.nextTicketToSell += ticketCount;

        for (uint128 i = 0; i < ticketCount; i++) {
            uint256 nftId = (uint256(eventId) << 128) + startSeat + i;
            ITicketNFT(nftContract).mintFromMarketPlace(msg.sender, nftId);
        }

        emit TicketsBought(eventId, ticketCount, "ERC20");
    }

    function setERC20Address(address newERC20Address) external onlyOwner {
        ERC20Address = newERC20Address;
        emit ERC20AddressUpdate(newERC20Address);
    }
}
