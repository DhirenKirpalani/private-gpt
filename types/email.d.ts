declare module "imap-simple" {
  export function connect(config: any): Promise<any>
}

declare module "mailparser" {
  export function simpleParser(source: any): Promise<any>
}
