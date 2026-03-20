#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

#[test]
fn test_mint_nft() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let result = client.mint(
        &minter,
        &String::from_str(&env, "Cosmic Art #1"),
        &String::from_str(&env, "A beautiful space painting"),
        &String::from_str(&env, "https://ipfs.io/ipfs/example1"),
    );

    assert_eq!(result, 1u64);

    let nft = client.get_nft(&1u64);
    assert_eq!(nft.name, String::from_str(&env, "Cosmic Art #1"));
    assert_eq!(nft.creator, minter);
}

#[test]
fn test_multiple_users_mint() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let id1 = client.mint(
        &user1,
        &String::from_str(&env, "Art 1"),
        &String::from_str(&env, "Desc 1"),
        &String::from_str(&env, "url1"),
    );
    let id2 = client.mint(
        &user2,
        &String::from_str(&env, "Art 2"),
        &String::from_str(&env, "Desc 2"),
        &String::from_str(&env, "url2"),
    );
    let id3 = client.mint(
        &user3,
        &String::from_str(&env, "Art 3"),
        &String::from_str(&env, "Desc 3"),
        &String::from_str(&env, "url3"),
    );

    assert_eq!(id1, 1u64);
    assert_eq!(id2, 2u64);
    assert_eq!(id3, 3u64);
    assert_eq!(client.get_nft_count(), 3u64);
}

#[test]
fn test_transfer_nft() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(
        &alice,
        &String::from_str(&env, "My NFT"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "url"),
    );

    assert_eq!(client.get_owner(&1u64), alice);

    client.transfer(&alice, &bob, &1u64);

    assert_eq!(client.get_owner(&1u64), bob);
}

#[test]
fn test_get_user_nfts() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(
        &alice,
        &String::from_str(&env, "Alice 1"),
        &String::from_str(&env, "D1"),
        &String::from_str(&env, "u1"),
    );
    client.mint(
        &bob,
        &String::from_str(&env, "Bob 1"),
        &String::from_str(&env, "D2"),
        &String::from_str(&env, "u2"),
    );
    client.mint(
        &alice,
        &String::from_str(&env, "Alice 2"),
        &String::from_str(&env, "D3"),
        &String::from_str(&env, "u3"),
    );

    let alice_nfts = client.get_user_nfts(&alice);
    assert_eq!(alice_nfts.len(), 2u32);

    let bob_nfts = client.get_user_nfts(&bob);
    assert_eq!(bob_nfts.len(), 1u32);
}

#[test]
fn test_like_nft() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let _user1 = Address::generate(&env);
    let _user2 = Address::generate(&env);

    client.mint(
        &minter,
        &String::from_str(&env, "Popular NFT"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "url"),
    );

    assert_eq!(client.get_likes(&1u64), 0u64);

    client.like(&1u64);
    assert_eq!(client.get_likes(&1u64), 1u64);

    client.like(&1u64);
    assert_eq!(client.get_likes(&1u64), 2u64);
}

#[test]
fn test_get_all_nfts() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    client.mint(
        &user,
        &String::from_str(&env, "NFT 1"),
        &String::from_str(&env, "D1"),
        &String::from_str(&env, "u1"),
    );
    client.mint(
        &user,
        &String::from_str(&env, "NFT 2"),
        &String::from_str(&env, "D2"),
        &String::from_str(&env, "u2"),
    );
    client.mint(
        &user,
        &String::from_str(&env, "NFT 3"),
        &String::from_str(&env, "D3"),
        &String::from_str(&env, "u3"),
    );

    let all_ids = client.get_all_nfts();
    assert_eq!(all_ids.len(), 3u32);
}
