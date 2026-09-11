declare global {
    namespace NodeJS {
        interface ProcessEnv {
            token: string;
            guildId: string;
            mongourl: string;
            hugging_face_token: string;
            environment: "dev" | "prod" | "debug";
            registerCommands?: string;
            PORT?: string;
        }
    }
}

export { };