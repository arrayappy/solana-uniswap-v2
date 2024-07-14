import * as anchor from "@project-serum/anchor";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, Connection, Signer } from "@solana/web3.js";
import { BN } from "bn.js";

export const expectRevert = async (promise: Promise<any>) => {
  try {
    await promise;
    throw new Error("Expected a revert");
  } catch {
    return;
  }
};

export const mintingTokens = async ({
  connection,
  creator,
  holder = creator,
  mintAKeypair,
  mintBKeypair,
  mintedAmount = 100,
  decimals = 6,
}: {
  connection: Connection;
  creator: Signer;
  holder?: Signer;
  mintAKeypair: Keypair;
  mintBKeypair: Keypair;
  mintedAmount?: number;
  decimals?: number;
}) => {
  // Mint tokens
  await connection.confirmTransaction(
    await connection.requestAirdrop(creator.publicKey, 10 ** 10)
  );
  await createMint(
    connection,
    creator,
    creator.publicKey,
    creator.publicKey,
    decimals,
    mintAKeypair
  );
  await createMint(
    connection,
    creator,
    creator.publicKey,
    creator.publicKey,
    decimals,
    mintBKeypair
  );
  await getOrCreateAssociatedTokenAccount(
    connection,
    holder,
    mintAKeypair.publicKey,
    holder.publicKey,
    true
  );
  await getOrCreateAssociatedTokenAccount(
    connection,
    holder,
    mintBKeypair.publicKey,
    holder.publicKey,
    true
  );
  await mintTo(
    connection,
    creator,
    mintAKeypair.publicKey,
    getAssociatedTokenAddressSync(
      mintAKeypair.publicKey,
      holder.publicKey,
      true
    ),
    creator.publicKey,
    mintedAmount * 10 ** decimals
  );
  await mintTo(
    connection,
    creator,
    mintBKeypair.publicKey,
    getAssociatedTokenAddressSync(
      mintBKeypair.publicKey,
      holder.publicKey,
      true
    ),
    creator.publicKey,
    mintedAmount * 10 ** decimals
  );
};

export interface TestData {
  id: PublicKey;
  fee: number;
  admin: Keypair;
  mintAKeypair: Keypair;
  mintBKeypair: Keypair;
  defaultSupply: anchor.BN;
  ammKey: PublicKey;
  minimumLiquidity: anchor.BN;
  poolKey: PublicKey;
  poolAuthority: PublicKey;
  mintLiquidity: PublicKey;
  depositAmountA: anchor.BN;
  depositAmountB: anchor.BN;
  liquidityAccount: PublicKey;
  poolAccountA: PublicKey;
  poolAccountB: PublicKey;
  holderAccountA: PublicKey;
  holderAccountB: PublicKey;
}

type TestDataDefaults = {
  [K in keyof TestData]+?: TestData[K];
};
export function createTestData(defaults?: TestDataDefaults): TestData {
  const id = defaults?.id || Keypair.generate().publicKey;
  const admin = Keypair.generate();
  const ammKey = PublicKey.findProgramAddressSync(
    [id.toBuffer()],
    anchor.workspace.SolanaUniswapV2.programId
  )[0];

  // Making sure tokens are in the right order
  const mintAKeypair = Keypair.generate();
  let mintBKeypair = Keypair.generate();
  while (
    new BN(mintBKeypair.publicKey.toBytes()).lt(
      new BN(mintAKeypair.publicKey.toBytes())
    )
  ) {
    mintBKeypair = Keypair.generate();
  }

  const poolAuthority = PublicKey.findProgramAddressSync(
    [
      ammKey.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
      Buffer.from("authority"),
    ],
    anchor.workspace.SolanaUniswapV2.programId
  )[0];
  const mintLiquidity = PublicKey.findProgramAddressSync(
    [
      ammKey.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
      Buffer.from("liquidity"),
    ],
    anchor.workspace.SolanaUniswapV2.programId
  )[0];
  const poolKey = PublicKey.findProgramAddressSync(
    [
      ammKey.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
    ],
    anchor.workspace.SolanaUniswapV2.programId
  )[0];
  return {
    id,
    fee: 500,
    admin,
    ammKey,
    mintAKeypair,
    mintBKeypair,
    mintLiquidity,
    poolKey,
    poolAuthority,
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
    liquidityAccount: getAssociatedTokenAddressSync(
      mintLiquidity,
      admin.publicKey,
      true
    ),
    holderAccountA: getAssociatedTokenAddressSync(
      mintAKeypair.publicKey,
      admin.publicKey,
      true
    ),
    holderAccountB: getAssociatedTokenAddressSync(
      mintBKeypair.publicKey,
      admin.publicKey,
      true
    ),
    depositAmountA: new BN(4 * 10 ** 6),
    depositAmountB: new BN(1 * 10 ** 6),
    minimumLiquidity: new BN(100),
    defaultSupply: new BN(100 * 10 ** 6),
  };
}
