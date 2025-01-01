import {
  createEua,
  createRequisition,
  deleteRequisitionById,
  obtainNewAccessRefreshTokenPair,
  requisitionById,
  retrieveAccountDetails,
  retrieveAllRequisitions,
  retrieveAllSupportedInstitutionsInAGivenCountry,
} from "#lib/services/gocardless/sdk.gen.js";
import { type MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const random = () => (Math.random() + 1).toString(36).substring(7);
export const loader = async () => {
  const tokens = await obtainNewAccessRefreshTokenPair({
    body: {
      secret_id: process.env.GOCARDLESS_SECRET_ID!,
      secret_key: process.env.GOCARDLESS_SECRET_KEY!,
    },
  });

  // const institutions = await retrieveAllSupportedInstitutionsInAGivenCountry({
  //   query: {
  //     country: "no",
  //   },
  //   headers: {
  //     Authorization: `Bearer ${tokens.data?.access}`,
  //   },
  // });

  const requisitions = await retrieveAllRequisitions({
    headers: {
      Authorization: `Bearer ${tokens.data?.access}`,
    },
  });
  console.log(requisitions.data?.count);
  if (requisitions.data?.count !== 0) {
    console.log(requisitions.data?.results[0].id);
    const requisition = await requisitionById({
      headers: {
        Authorization: `Bearer ${tokens.data?.access}`,
      },
      path: {
        id: requisitions.data?.results[0].id || "",
      },
    });

    const accs = requisition.data?.accounts || [];
    const accounts = await Promise.all(
      await accs.map(
        async (acc) =>
          await retrieveAccountDetails({
            path: { id: acc },
            headers: { Authorization: `Bearer ${tokens.data?.access}` },
          }).then((res) => res.data?.account)
      )
    );

    return {
      requisition: requisition.data,
      access: tokens.data?.access,
      accounts,
    };
  }
  const agreement = await createEua({
    headers: {
      Authorization: `Bearer ${tokens.data?.access}`,
    },
    body: {
      institution_id: "DNB_DNBANOKK", // NORWEGIAN_NO_NORWNOK1
      max_historical_days: 395,
      access_valid_for_days: 179,
      access_scope: ["balances", "details", "transactions"],
    },
  });

  const requisition = await createRequisition({
    headers: {
      Authorization: `Bearer ${tokens.data?.access}`,
    },
    body: {
      institution_id: "DNB_DNBANOKK",
      redirect: "http://localhost:5173/",
      agreement: `${agreement.data?.id}`,
      reference: `${random()}`,
      account_selection: false,
      redirect_immediate: true,
    },
  });

  return {
    requisition: requisition.data,
    access: tokens.data?.access,
    accounts: [],
  };
};
export default function Index() {
  const { requisition, access, accounts } = useLoaderData<typeof loader>();
  console.log(requisition);
  return (
    <main>
      <h1>Welcome!</h1>
      <div>
        <p>{requisition?.id}</p>
        <p>{requisition?.institution_id}</p>
        <p>{requisition?.status}</p>
        <a href={requisition?.link} target="_blank" rel="noreferrer">
          {requisition?.link}
        </a>
        {accounts?.map((account) => (
          <div key={account?.bban}>
            <p>{JSON.stringify(account)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
