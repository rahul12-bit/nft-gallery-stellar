#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Counter,
    Nft(u64),
    Owner(u64),
    Likes(u64),
    UserNfts(Address),
    AllNfts,
}

#[contracttype]
#[derive(Clone)]
pub struct NftData {
    pub id: u64,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub creator: Address,
    pub minted_at: u64,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// Mint a new NFT — anyone can call, no admin required
    pub fn mint(
        env: Env,
        minter: Address,
        name: String,
        description: String,
        image_url: String,
    ) -> u64 {
        minter.require_auth();

        let counter_key = DataKey::Counter;
        let counter: u64 = env.storage().instance().get(&counter_key).unwrap_or(0);
        let new_id = counter + 1;

        let nft = NftData {
            id: new_id,
            name,
            description,
            image_url,
            creator: minter.clone(),
            minted_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&DataKey::Nft(new_id), &nft);
        env.storage()
            .instance()
            .set(&DataKey::Owner(new_id), &minter);
        env.storage().instance().set(&DataKey::Likes(new_id), &0u64);
        env.storage().instance().set(&counter_key, &new_id);

        // Add to all NFTs list
        let mut all_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllNfts)
            .unwrap_or(Vec::new(&env));
        all_nfts.push_back(new_id);
        env.storage().instance().set(&DataKey::AllNfts, &all_nfts);

        // Add to user's NFTs
        let mut user_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::UserNfts(minter.clone()))
            .unwrap_or(Vec::new(&env));
        user_nfts.push_back(new_id);
        env.storage()
            .instance()
            .set(&DataKey::UserNfts(minter), &user_nfts);

        new_id
    }

    /// Get NFT details
    pub fn get_nft(env: Env, nft_id: u64) -> NftData {
        env.storage().instance().get(&DataKey::Nft(nft_id)).unwrap()
    }

    /// Get all NFT IDs
    pub fn get_all_nfts(env: Env) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::AllNfts)
            .unwrap_or(Vec::new(&env))
    }

    /// Get total NFT count
    pub fn get_nft_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Counter).unwrap_or(0)
    }

    /// Get owner of an NFT
    pub fn get_owner(env: Env, nft_id: u64) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Owner(nft_id))
            .unwrap()
    }

    /// Transfer NFT to another address
    pub fn transfer(env: Env, from: Address, to: Address, nft_id: u64) {
        from.require_auth();

        let owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner(nft_id.clone()))
            .unwrap();
        assert_eq!(owner, from, "not the owner");

        env.storage()
            .instance()
            .set(&DataKey::Owner(nft_id.clone()), &to);

        // Update user's NFT list - remove from sender
        let from_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::UserNfts(from.clone()))
            .unwrap();
        let mut new_from_nfts: Vec<u64> = Vec::new(&env);
        let mut i: u32 = 0;
        while i < from_nfts.len() {
            if from_nfts.get(i).unwrap() != nft_id {
                new_from_nfts.push_back(from_nfts.get(i).unwrap());
            }
            i += 1;
        }
        env.storage()
            .instance()
            .set(&DataKey::UserNfts(from), &new_from_nfts);

        // Add to receiver's list
        let mut to_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::UserNfts(to.clone()))
            .unwrap_or(Vec::new(&env));
        to_nfts.push_back(nft_id);
        env.storage()
            .instance()
            .set(&DataKey::UserNfts(to), &to_nfts);
    }

    /// Get NFTs owned by a user
    pub fn get_user_nfts(env: Env, user: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::UserNfts(user))
            .unwrap_or(Vec::new(&env))
    }

    /// Like an NFT — anyone can call
    pub fn like(env: Env, nft_id: u64) {
        let likes: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Likes(nft_id))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Likes(nft_id), &(likes + 1));
    }

    /// Get like count for an NFT
    pub fn get_likes(env: Env, nft_id: u64) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::Likes(nft_id))
            .unwrap_or(0)
    }
}

mod test;
