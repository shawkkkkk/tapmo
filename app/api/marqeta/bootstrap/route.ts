import { NextResponse } from "next/server";
import { marqetaCredentialsConfigured, marqetaRequest } from "@/lib/marqeta";

export const runtime = "nodejs";

type CardProduct = {
  token?: string;
  name?: string;
  active?: boolean;
};

type CardProductsResponse = {
  data?: CardProduct[];
};

type MarqetaUser = {
  token?: string;
  first_name?: string;
  last_name?: string;
  active?: boolean;
};

type MarqetaCard = {
  token?: string;
  user_token?: string;
  card_product_token?: string;
  last_four?: string;
  state?: string;
};

function randomToken(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function POST() {
  if (!marqetaCredentialsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Marqeta sandbox credentials are not configured. Add them in Vercel first.",
      },
      { status: 503 }
    );
  }

  try {
    const products = await marqetaRequest<CardProductsResponse>({
      route: "/cardproducts?count=100",
    });

    const cardProduct = products.data?.find(
      (product) => product.active !== false && Boolean(product.token)
    );

    if (!cardProduct?.token) {
      return NextResponse.json(
        {
          error:
            "No active Marqeta sandbox card product was found. Create one in the sandbox dashboard first.",
        },
        { status: 409 }
      );
    }

    const userToken = randomToken("tapmo-user");

    const user = await marqetaRequest<MarqetaUser>({
      method: "POST",
      route: "/users",
      body: {
        token: userToken,
        first_name: "Tapmo",
        last_name: "Sandbox",
        active: true,
      },
    });

    const card = await marqetaRequest<MarqetaCard>({
      method: "POST",
      route: "/cards",
      body: {
        user_token: user.token || userToken,
        card_product_token: cardProduct.token,
      },
    });

    return NextResponse.json({
      environment: "sandbox",
      created: true,
      user: {
        token: user.token || userToken,
      },
      cardProduct: {
        token: cardProduct.token,
        name: cardProduct.name || null,
      },
      card: {
        token: card.token || null,
        lastFour: card.last_four || null,
        state: card.state || null,
      },
      warning:
        "This card exists only in Marqeta sandbox and cannot be used for real-world purchases.",
    });
  } catch (caught) {
    return NextResponse.json(
      {
        error:
          caught instanceof Error
            ? caught.message
            : "Could not create Marqeta sandbox card.",
      },
      { status: 502 }
    );
  }
}
