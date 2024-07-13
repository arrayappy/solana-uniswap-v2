import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createMint, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SolanaUniswapV2 } from "../target/types/solana_uniswap_v2";
import { expect } from "chai";
import { expectRevert } from "./utils";

describe("amm-tutorial", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaUniswapV2 as Program<SolanaUniswapV2>;

  let id: PublicKey;
  let fee: number;
  let admin: Keypair;
  let mintAKeypair: Keypair;
  let mintBKeypair: Keypair;
  let ammKey: PublicKey;
  let poolKey: PublicKey;
  let poolAuthority: PublicKey;

  const mintingTokens = async () => {
    // Mint tokens
    await connection.confirmTransaction(
      await connection.requestAirdrop(admin.publicKey, 10 ** 10)
    );
    await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      6,
      mintAKeypair
    );
    await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      6,
      mintBKeypair
    );
  };

  describe("Initialize pool", () => {
    beforeEach(async () => {
      id = Keypair.generate().publicKey;
      fee = 500;
      admin = Keypair.generate();
      ammKey = PublicKey.findProgramAddressSync(
        [id.toBuffer()],
        program.programId
      )[0];
      mintAKeypair = Keypair.generate();
      mintBKeypair = Keypair.generate();
      poolKey = PublicKey.findProgramAddressSync(
        [
          id.toBuffer(),
          mintAKeypair.publicKey.toBuffer(),
          mintBKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )[0];
      poolAuthority = PublicKey.findProgramAddressSync(
        [
          id.toBuffer(),
          mintAKeypair.publicKey.toBuffer(),
          mintBKeypair.publicKey.toBuffer(),
          Buffer.from("authority"),
        ],
        program.programId
      )[0];

      await program.methods
        .createAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      await mintingTokens();
    });

    it("Initializing pool", async () => {
      await program.methods
        .initializePool()
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority,
          mintA: mintAKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          poolAccountA: getAssociatedTokenAddressSync(
            mintAKeypair.publicKey,
            poolAuthority,
            true
          ),
          poolAccountB: getAssociatedTokenAddressSync(
            mintBKeypair.publicKey,
            poolAuthority,
            true
          ),
        })
        .rpc();
    });

    it("Invalid mints", async () => {
      mintBKeypair = mintAKeypair;
      poolKey = PublicKey.findProgramAddressSync(
        [
          id.toBuffer(),
          mintAKeypair.publicKey.toBuffer(),
          mintBKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )[0];
      poolAuthority = PublicKey.findProgramAddressSync(
        [
          id.toBuffer(),
          mintAKeypair.publicKey.toBuffer(),
          mintBKeypair.publicKey.toBuffer(),
          Buffer.from("authority"),
        ],
        program.programId
      )[0];

      await expectRevert(
        program.methods
          .initializePool()
          .accounts({
            amm: ammKey,
            pool: poolKey,
            poolAuthority,
            mintA: mintAKeypair.publicKey,
            mintB: mintBKeypair.publicKey,
            poolAccountA: getAssociatedTokenAddressSync(
              mintAKeypair.publicKey,
              poolAuthority,
              true
            ),
            poolAccountB: getAssociatedTokenAddressSync(
              mintBKeypair.publicKey,
              poolAuthority,
              true
            ),
          })
          .rpc()
      );
    });
  });
});