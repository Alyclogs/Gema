declare global {
    namespace NodeJS {
        interface ProcessEnv {
            token: string;
            guildId: string;
            mongourl: string;
            environment: "dev" | "prod" | "debug";
        }
    }
}

export { };