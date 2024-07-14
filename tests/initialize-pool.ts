import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { SolanaUniswapV2 } from "../target/types/solana_uniswap_v2";
import { TestData, createTestData, expectRevert, mintingTokens } from "./utils";

describe("Initialize pool", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaUniswapV2 as Program<SolanaUniswapV2>;

  let values: TestData;

  beforeEach(async () => {
    values = createTestData();

    await program.methods
      .initializeAmm(values.id, values.fee)
      .accounts({ amm: values.ammKey, admin: values.admin.publicKey })
      .rpc();

    await mintingTokens({
      connection,
      creator: values.admin,
      mintAKeypair: values.mintAKeypair,
      mintBKeypair: values.mintBKeypair,
    });
  });

  it("Initializing pool", async () => {
    await program.methods
      .initializePool()
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        mintLiquidity: values.mintLiquidity,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
      })
      .rpc({ skipPreflight: true });
  });

  it("Invalid mints", async () => {
    values = createTestData({
      mintBKeypair: values.mintAKeypair,
      poolKey: PublicKey.findProgramAddressSync(
        [
          values.id.toBuffer(),
          values.mintAKeypair.publicKey.toBuffer(),
          values.mintBKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )[0],
      poolAuthority: PublicKey.findProgramAddressSync(
        [
          values.id.toBuffer(),
          values.mintAKeypair.publicKey.toBuffer(),
          values.mintBKeypair.publicKey.toBuffer(),
          Buffer.from("authority"),
        ],
        program.programId
      )[0],
    });

    await expectRevert(
      program.methods
        .initializePool()
        .accounts({
          amm: values.ammKey,
          pool: values.poolKey,
          poolAuthority: values.poolAuthority,
          mintLiquidity: values.mintLiquidity,
          mintA: values.mintAKeypair.publicKey,
          mintB: values.mintBKeypair.publicKey,
          poolAccountA: values.poolAccountA,
          poolAccountB: values.poolAccountB,
        })
        .rpc()
    );
  });
});
