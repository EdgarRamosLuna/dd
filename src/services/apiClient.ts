import { Capacitor } from "@capacitor/core";
import { Http } from "@capacitor-community/http";
import axios from "axios";
import {
  FORM_URLENCODED_HEADERS,
  URL_SERVICIOS,
  buildFormBody
} from "../config/api";

const parseResponseData = <T>(data: unknown): T => {
  if (typeof data !== "string") {
    return data as T;
  }

  try {
    return JSON.parse(data) as T;
  } catch {
    return data as T;
  }
};

export const postForm = async <T>(
  endpoint: string,
  values: Record<string, string>,
  timeout: number
): Promise<T> => {
  const url = `${URL_SERVICIOS}${endpoint}`;

  if (Capacitor.isNativePlatform()) {
    const response = await Http.post({
      url,
      headers: FORM_URLENCODED_HEADERS,
      data: values,
      connectTimeout: timeout,
      readTimeout: timeout,
      responseType: "json",
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return parseResponseData<T>(response.data);
  }

  const body = buildFormBody(values);
  const response = await axios.post<T>(url, body, {
    timeout,
    headers: FORM_URLENCODED_HEADERS
  });

  return response.data;
};
