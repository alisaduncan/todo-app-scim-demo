export interface IScimEmail {
  value: string;
  type: string;
  primary: boolean;
}

export interface IScimResource {
  id?: string;
  schemas: string[];
  meta?: IMetadata;
}

export interface IMetadata {
  resourceType: RESOURCE_TYPES;
  location?: string;
}

export interface IOktaRole extends IScimResource{
  displayName: string;
}

export interface IResourceType {
  id?: string;
  schemas: string[];
  name: string;
  description?: string;
  endpoint: string;
  schema: string;
  schemaExtensions?: {schema: string, required: boolean}[];
  meta: IMetadata;
}

export interface IScimUser extends IScimResource {
  userName?: string;
  name?: {
    givenName: string;
    familyName: string;
  };
  emails: IScimEmail[];
  displayName?: string;
  locale?: string;
  externalId?: string;
  groups?: [];
  password?: string;
  active?: boolean;
  detail?: string;
  status?: number;
  roles?: { value: string, display: string }[];
}

export interface IListResponse<T extends IScimResource | IResourceType | ISchema> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface IErrorResponse {
  schemas: string[];
  scimType?: string;
  detail: string;
  status: number;
}

export interface ISchema {
  id: string;
  name?: string;
  description?: string;
  attributes: IAttribute[];
  meta: IMetadata;
}

export interface IAttribute {
  name: string;
  description: string;
  type: string;
  multiValued: boolean;
  required: boolean;
  caseExact: boolean;
  mutability: string;
  returned: string;
  uniqueness: string;
}

export interface IScope extends IScimResource {
  type: string;
  displayName: string;
}

export const SCHEMA_USER = 'urn:ietf:params:scim:schemas:core:2.0:User';
export const SCHEMA_LIST_RESPONSE = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
export const SCHEMA_ERROR_RESPONSE = 'urn:ietf:params:scim:api:messages:2.0:Error';
export const SCHEMA_RESOURCE_TYPE = 'urn:ietf:params:scim:schemas:core:2.0:ResourceType';

export const SCHEMA_OKTA_ROLE = 'urn:ietf:scim:schemas:core:1.0:Role';
export const SCHEMA_OKTA_ENTITLEMENT = 'urn:ietf:scim:schemas:core:1.0:Entitlement';
export const SCHEMA_SCOPE = 'urn:bestapps:scim:schemas:extension:todoapp:1.0:Scope';

export type RESOURCE_TYPES = 'User' | 'Group' | 'Role' | 'ResourceType' | 'Schema';

export class SCIMRequestQuery {
  filter?: {
    attribute: string,
    operation: string,
    value: string
  };
  startIndex: number;
  count: number;


  constructor(query: { filter?: string, startIndex?: string, count?: string }) {
    this.startIndex = parseInt(query.startIndex ?? '1');
    this.count = parseInt(query.count ?? '100');

    if (query.filter) {
      // works for simple cases that meet the form: attribute operation "value"
      const [,attribute, operation, value ] = /(?<attribute>[a-z]+)\s{1}(?<operation>[a-z]{2})\s{1}\"(?<value>\S+)"/i.exec(query.filter) || [];
      this.filter = {attribute, operation, value};
    }
  }
}
